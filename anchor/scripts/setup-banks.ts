#!/usr/bin/env tsx
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js'
import {
  createMint,
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  NATIVE_MINT
} from '@solana/spl-token'
import {
  getInitializeBankInstructionAsync,
  getInitializeAccountInstructionAsync,
  getDepositInstruction
} from '../src/client/js/generated/instructions'
import { fetchBank } from '../src/client/js/generated/accounts'
import { address } from 'gill'
import { createKeyPairSignerFromBytes, KeyPairSigner } from '@solana/signers'
import fs from 'fs'

async function main() {
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
  
  // Load deployer keypair
  const keypairPath = `${process.env.HOME}/.config/solana/id.json`
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
  const keypairBytes = new Uint8Array(keypairData)
  const deployer = Keypair.fromSecretKey(keypairBytes)
  const deployerSigner = await createKeyPairSignerFromBytes(keypairBytes)

  console.log('🚀 Setting up lending protocol banks...')

  // Airdrop SOL to deployer for SOL transfers
  console.log('💰 Requesting SOL airdrop for deployer...')
  const airdropSig = await connection.requestAirdrop(deployer.publicKey, 100 * LAMPORTS_PER_SOL)
  await connection.confirmTransaction(airdropSig)
  console.log('✅ Airdropped 100 SOL to deployer')
  
  // Define token mints
  let SOL_MINT: PublicKey
  let USDC_MINT: PublicKey

  // Create SOL-like mint for localnet (avoiding NATIVE_MINT PDA conflicts)
  try {
    SOL_MINT = new PublicKey(process.env.SOL_MINT!)
    console.log('✅ Using existing SOL mint:', SOL_MINT.toBase58())
  } catch {
    console.log('🪙 Creating SOL mint for localnet...')
    SOL_MINT = await createMint(
      connection,
      deployer,
      deployer.publicKey,
      null,
      9 // SOL decimals
    )
    console.log('✅ SOL Mint created:', SOL_MINT.toBase58())
  }

  // Initialize SOL Bank
  console.log('🏦 Initializing SOL Bank...')
  await initializeAndFundBank(
    connection,
    deployer,
    deployerSigner,
    SOL_MINT,
    10 * LAMPORTS_PER_SOL, // 10 SOL
    'SOL'
  )

  // Create USDC mint for localnet
  try {
    USDC_MINT = new PublicKey(process.env.USDC_MINT!)
    console.log('✅ Using existing USDC mint:', USDC_MINT.toBase58())
  } catch {
    console.log('🪙 Creating USDC mint for localnet...')
    USDC_MINT = await createMint(
      connection,
      deployer,
      deployer.publicKey,
      null,
      6 // USDC decimals
    )
    console.log('✅ USDC Mint created:', USDC_MINT.toBase58())
  }

  // Initialize USDC Bank
  console.log('🏦 Initializing USDC Bank...')
  await initializeAndFundBank(
    connection,
    deployer,
    deployerSigner,
    USDC_MINT,
    10 * 1_000_000, // 10 USDC (6 decimals)
    'USDC'
  )
  
  // Save configuration
  const config = {
    SOL_MINT: SOL_MINT.toBase58(),
    USDC_MINT: USDC_MINT.toBase58(),
    SOL_MINT_AUTHORITY: deployer.publicKey.toBase58(), // Mint authority is the deployer
    USDC_MINT_AUTHORITY: deployer.publicKey.toBase58(), // Mint authority is the deployer
    banks_initialized: true
  }
  
  // Create public directory and copy config for Next.js
  fs.mkdirSync('../public/anchor', { recursive: true })
  fs.writeFileSync('../public/anchor/banks-config.json', JSON.stringify(config, null, 2))
  console.log('✅ Banks setup complete! Config saved to ../public/anchor/banks-config.json')

  // Check for user address argument for faucet
  const userAddress = process.argv[2]
  if (userAddress) {
    console.log(`🚰 Minting test tokens to user: ${userAddress}`)
    await mintTokensToUser(connection, deployer, SOL_MINT, USDC_MINT, userAddress)
  }
}

async function mintTokensToUser(
  connection: Connection,
  deployer: Keypair,
  solMint: PublicKey,
  usdcMint: PublicKey,
  userAddress: string
) {
  const userPublicKey = new PublicKey(userAddress)

  // Mint 5 SOL to user
  const solTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    deployer,
    solMint,
    userPublicKey
  )
  await mintTo(
    connection,
    deployer,
    solMint,
    solTokenAccount.address,
    deployer.publicKey,
    5 * LAMPORTS_PER_SOL
  )
  console.log('✅ Minted 5 SOL to user')

  // Mint 1000 USDC to user
  const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    deployer,
    usdcMint,
    userPublicKey
  )
  await mintTo(
    connection,
    deployer,
    usdcMint,
    usdcTokenAccount.address,
    deployer.publicKey,
    1000 * 1_000_000 // 1000 USDC
  )
  console.log('✅ Minted 1000 USDC to user')
}

async function initializeAndFundBankIfNeeded(
  connection: Connection,
  deployer: Keypair,
  deployerSigner: KeyPairSigner,
  mint: PublicKey,
  amount: number,
  tokenName: string
) {
  // Always initialize bank (simplified for faucet functionality)
  console.log(`📝 Initializing ${tokenName} Bank...`)
  await initializeAndFundBank(connection, deployer, deployerSigner, mint, amount, tokenName)
}

async function initializeAndFundBank(
  connection: Connection,
  deployer: Keypair,
  deployerSigner: KeyPairSigner,
  mint: PublicKey,
  amount: number,
  tokenName: string
) {
  // 1. Initialize the bank
  const bankIx = await getInitializeBankInstructionAsync({
    signer: deployerSigner,
    mint: address(mint.toString()),
    liquidationThreshold: 80, // 80%
    maxLtv: 70, // 70%
  })
  
  // Convert to web3 instruction with correct account permissions
  // InitializeBank accounts: [signer, mint, bank, bank_token_account, token_program, system_program]
  // Writable: signer(0), bank(2), bank_token_account(3)
  // Signer: signer(0)
  const web3BankIx = {
    keys: bankIx.accounts.map((acc: any, index: number) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: index === 0, // Only signer is a signer
      isWritable: index === 0 || index === 2 || index === 3 // signer, bank, bank_token_account are writable
    })),
    programId: new PublicKey(bankIx.programAddress),
    data: Buffer.from(bankIx.data)
  }
  
  // Send bank initialization
  const bankTx = new Transaction().add(web3BankIx)
  const { blockhash } = await connection.getLatestBlockhash()
  bankTx.recentBlockhash = blockhash
  bankTx.feePayer = deployer.publicKey
  bankTx.sign(deployer)
  
  const bankSig = await connection.sendRawTransaction(bankTx.serialize())
  await connection.confirmTransaction(bankSig)

  // Extract bank address from instruction (should be accounts[2])
  const bankAddress = bankIx.accounts[2]?.address
  console.log(`✅ ${tokenName} Bank initialized: ${bankSig}`)
  console.log(`📍 ${tokenName} Bank address: ${bankAddress}`)
  
  // 2. Create deployer's token account and fund it
  const deployerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    deployer,
    mint,
    deployer.publicKey
  )

  // Mint tokens to deployer (both SOL and USDC are now custom tokens)
  await mintTo(
    connection,
    deployer,
    mint,
    deployerTokenAccount.address,
    deployer.publicKey,
    amount
  )
  const displayAmount = tokenName === 'SOL' ? amount / LAMPORTS_PER_SOL : amount / 1_000_000
  console.log(`✅ Minted ${displayAmount} ${tokenName} to deployer`)

  // 3. Initialize deployer user account (if not exists)
  try {
    // Try to initialize user account - this might fail if it already exists
    // Use USDC mint for user account initialization (doesn't matter which one, just needs an address)
    const usdcMint = tokenName === 'SOL' ? '9HxcjJsPhwf6C68AYm96q7oP8nTdHLVfuiLn5dfgKZX5' : mint.toString()
    const userAccountIx = await getInitializeAccountInstructionAsync({
      signer: deployerSigner,
      usdcAddress: address(usdcMint)
    })

    // Convert Gill instruction to web3 with correct account permissions
    // InitializeAccount accounts: [signer, user_account, system_program]
    // Writable: signer(0), user_account(1)
    // Signer: signer(0)
    const web3UserAccountIx = {
      keys: userAccountIx.accounts.map((acc: any, index: number) => ({
        pubkey: new PublicKey(acc.address),
        isSigner: index === 0, // Only signer is a signer
        isWritable: index === 0 || index === 1 // signer and user_account are writable
      })),
      programId: new PublicKey(userAccountIx.programAddress),
      data: Buffer.from(userAccountIx.data)
    }

    const userAccountTx = new Transaction().add(web3UserAccountIx)
    const { blockhash: userBlockhash } = await connection.getLatestBlockhash()
    userAccountTx.recentBlockhash = userBlockhash
    userAccountTx.feePayer = deployer.publicKey
    userAccountTx.sign(deployer)

    const userAccountSig = await connection.sendRawTransaction(userAccountTx.serialize())
    await connection.confirmTransaction(userAccountSig)
    console.log(`✅ Deployer user account initialized: ${userAccountSig}`)
  } catch (e) {
    console.log(`ℹ️  Deployer user account may already exist, continuing...`)
  }

  // 4. Deposit tokens into the bank using the lending protocol deposit instruction
  console.log(`💰 Depositing ${amount / (tokenName === 'SOL' ? LAMPORTS_PER_SOL : 1_000_000)} ${tokenName} into bank...`)

  // Derive the required PDA addresses
  const [derivedBankAddress] = await PublicKey.findProgramAddress(
    [mint.toBuffer()],
    new PublicKey("9CoY42r3y5WFDJjQX97e9m9THcVGpvuVSKjBjGkiksMR")
  )

  const [derivedBankTokenAccountAddress] = await PublicKey.findProgramAddress(
    [Buffer.from("Treasury"), mint.toBuffer()],
    new PublicKey("9CoY42r3y5WFDJjQX97e9m9THcVGpvuVSKjBjGkiksMR")
  )

  const [derivedUserAccountAddress] = await PublicKey.findProgramAddress(
    [deployer.publicKey.toBuffer()],
    new PublicKey("9CoY42r3y5WFDJjQX97e9m9THcVGpvuVSKjBjGkiksMR")
  )

  const derivedUserTokenAccount = await getAssociatedTokenAddress(mint, deployer.publicKey)

  console.log('Derived addresses:')
  console.log('  Bank:', derivedBankAddress.toString())
  console.log('  Bank Token Account:', derivedBankTokenAccountAddress.toString())
  console.log('  User Account:', derivedUserAccountAddress.toString())
  console.log('  User Token Account:', derivedUserTokenAccount.toString())

  // Verify addresses match what we expect
  console.log('Expected bank address:', bankAddress)
  console.log('Derived bank address:', derivedBankAddress.toString())
  console.log('Addresses match:', derivedBankAddress.toString() === bankAddress)

  // Create deposit instruction with explicit PDA addresses
  const depositIx = await getDepositInstruction({
    signer: deployerSigner,
    mint: address(mint.toString()),
    bank: address(derivedBankAddress.toString()),
    bankTokenAccount: address(derivedBankTokenAccountAddress.toString()),
    userAccount: address(derivedUserAccountAddress.toString()),
    userTokenAccount: address(derivedUserTokenAccount.toString()),
    amountToDeposit: amount
  })

  console.log('Deposit instruction accounts:')
  depositIx.accounts.forEach((acc: any, index: number) => {
    console.log(`  ${index}: ${acc.address}`)
  })

  // Convert Gill instruction to web3 with correct account permissions
  // Deposit accounts: [signer, mint, bank, bank_token_account, user_account, user_token_account, associated_token_program, token_program, system_program]
  // Writable: signer(0), bank(2), bank_token_account(3), user_account(4), user_token_account(5)
  // Signer: signer(0)
  const web3DepositIx = {
    keys: depositIx.accounts.map((acc: any, index: number) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: index === 0, // Only signer is a signer
      isWritable: index === 0 || index === 2 || index === 3 || index === 4 || index === 5 // signer, bank, bank_token_account, user_account, user_token_account are writable
    })),
    programId: new PublicKey(depositIx.programAddress),
    data: Buffer.from(depositIx.data)
  }

  // Send the deposit transaction
  const depositTx = new Transaction().add(web3DepositIx)
  const { blockhash: depositBlockhash } = await connection.getLatestBlockhash()
  depositTx.recentBlockhash = depositBlockhash
  depositTx.feePayer = deployer.publicKey
  depositTx.sign(deployer)

  const depositSig = await connection.sendRawTransaction(depositTx.serialize())
  await connection.confirmTransaction(depositSig)
  console.log(`✅ ${tokenName} deposited into bank: ${depositSig}`)
}

main().catch(console.error)