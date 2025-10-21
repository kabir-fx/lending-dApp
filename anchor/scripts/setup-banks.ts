#!/usr/bin/env tsx
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js'
import {
  createMint,
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  NATIVE_MINT
} from '@solana/spl-token'
import {
  getInitializeBankInstructionAsync
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
    banks_initialized: true
  }
  
  // Create public directory and copy config for Next.js
  fs.mkdirSync('../public/anchor', { recursive: true })
  fs.writeFileSync('../public/anchor/banks-config.json', JSON.stringify(config, null, 2))
  console.log('✅ Banks setup complete! Config saved to ../public/anchor/banks-config.json')
}

async function initializeAndFundBankIfNeeded(
  connection: Connection,
  deployer: Keypair,
  deployerSigner: KeyPairSigner,
  mint: PublicKey,
  amount: number,
  tokenName: string
) {
  // Check if bank already exists
  try {
    // Derive the bank address (PDA from mint)
    const [bankAddress] = await PublicKey.findProgramAddress(
      [mint.toBuffer()],
      new PublicKey("9CoY42r3y5WFDJjQX97e9m9THcVGpvuVSKjBjGkiksMR") // Program ID
    )
    await fetchBank(connection, bankAddress)
    console.log(`✅ ${tokenName} Bank already exists, skipping initialization`)
  } catch {
    console.log(`📝 ${tokenName} Bank doesn't exist, initializing...`)
    await initializeAndFundBank(connection, deployer, deployerSigner, mint, amount, tokenName)
  }
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
  
  // Convert to web3 instruction
  const web3BankIx = {
    keys: bankIx.accounts.map((acc: any) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: acc.address === deployer.publicKey.toString(),
      isWritable: true
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
  console.log(`✅ ${tokenName} Bank initialized: ${bankSig}`)
  
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

  // 3. Deposit tokens into the bank - DIRECT TRANSFER
  console.log(`💰 Depositing ${amount / (tokenName === 'SOL' ? LAMPORTS_PER_SOL : 1_000_000)} ${tokenName} into bank...`)
  
  // Get the bank token account address (PDA)
  const [bankTokenAccount] = await PublicKey.findProgramAddress(
    [Buffer.from("Treasury"), mint.toBuffer()],
    new PublicKey("9CoY42r3y5WFDJjQX97e9m9THcVGpvuVSKjBjGkiksMR") // Your program ID
  )
  
  // Create transfer instruction
  const transferIx = createTransferCheckedInstruction(
    deployerTokenAccount.address, // From: deployer's token account
    mint,                         // Mint
    bankTokenAccount,             // To: bank's token account  
    deployer.publicKey,           // Owner
    amount,                       // Amount
    tokenName === 'SOL' ? 9 : 6   // Decimals
  )
  
  // Send the transfer transaction
  const depositTx = new Transaction().add(transferIx)
  const { blockhash: depositBlockhash } = await connection.getLatestBlockhash()
  depositTx.recentBlockhash = depositBlockhash
  depositTx.feePayer = deployer.publicKey
  depositTx.sign(deployer)
  
  const depositSig = await connection.sendRawTransaction(depositTx.serialize())
  await connection.confirmTransaction(depositSig)
  console.log(`✅ ${tokenName} deposited into bank: ${depositSig}`)
}

main().catch(console.error)