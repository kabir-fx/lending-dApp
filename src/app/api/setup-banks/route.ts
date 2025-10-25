import { NextResponse, NextRequest } from 'next/server'
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
} from '@solana/spl-token'
import {
  getInitializeBankInstructionAsync,
  getInitializeAccountInstructionAsync,
  getDepositInstructionAsync
} from '../../../../anchor/src/client/js/generated/instructions'
import { address } from 'gill'
import { createKeyPairSignerFromBytes, KeyPairSigner } from '@solana/signers'
import fs from 'fs'
import path from 'path'
import { TokenType } from '../../../../anchor/src/client/js/generated/types'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting bank setup process...')

    // Retrieve user wallet address from request body
    const body = await request.json()
    const userWalletAddress = body.userWalletAddress

    const connection = new Connection('http://127.0.0.1:8899', 'confirmed')

    // Load deployer keypair from environment or file
    let deployer: Keypair
    let deployerSigner: KeyPairSigner

    // Try to load from environment variable first (more secure)
    if (process.env.DEPLOYER_PRIVATE_KEY) {
      const privateKeyArray = JSON.parse(process.env.DEPLOYER_PRIVATE_KEY)
      const keypairBytes = new Uint8Array(privateKeyArray)
      deployer = Keypair.fromSecretKey(keypairBytes)
      deployerSigner = await createKeyPairSignerFromBytes(keypairBytes)
    } else {
      // Fallback to loading from file system (for development)
      const keypairPath = `${process.env.HOME}/.config/solana/id.json`
      if (!fs.existsSync(keypairPath)) {
        return NextResponse.json({
          success: false,
          error: 'Deployer keypair not found. Please ensure Solana CLI is configured or set DEPLOYER_PRIVATE_KEY environment variable.'
        }, { status: 500 })
      }
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
      const keypairBytes = new Uint8Array(keypairData)
      deployer = Keypair.fromSecretKey(keypairBytes)
      deployerSigner = await createKeyPairSignerFromBytes(keypairBytes)
    }

    console.log('✅ Deployer loaded:', deployer.publicKey.toBase58())

    // Airdrop SOL to deployer for fees
    console.log('💰 Requesting SOL airdrop for deployer...')
    const airdropSig = await connection.requestAirdrop(deployer.publicKey, 100 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction({
      signature: airdropSig,
      ...(await connection.getLatestBlockhash())
    })
    console.log('✅ Airdropped 100 SOL to deployer')

    // Create SOL mint
    console.log('🪙 Creating SOL mint...')
    const SOL_MINT = await createMint(
      connection,
      deployer,
      deployer.publicKey,
      null,
      9 // SOL decimals
    )
    console.log('✅ SOL Mint created:', SOL_MINT.toBase58())

    // Create USDC mint
    console.log('🪙 Creating USDC mint...')
    const USDC_MINT = await createMint(
      connection,
      deployer,
      deployer.publicKey,
      null,
      6 // USDC decimals
    )
    console.log('✅ USDC Mint created:', USDC_MINT.toBase58())

    // Initialize SOL Bank
    console.log('🏦 Initializing SOL Bank...')
    await initializeAndFundBank(
      connection,
      deployer,
      deployerSigner,
      USDC_MINT,
      SOL_MINT,
      50 * LAMPORTS_PER_SOL, // 50 SOL
      'SOL'
    )

    // Initialize USDC Bank
    console.log('🏦 Initializing USDC Bank...')
    await initializeAndFundBank(
      connection,
      deployer,
      deployerSigner,
      USDC_MINT,
      SOL_MINT,
      50 * 1_000_000, // 50 USDC (6 decimals)
      'USDC'
    )

    // Save configuration
    const config = {
      SOL_MINT: SOL_MINT.toBase58(),
      USDC_MINT: USDC_MINT.toBase58(),
      SOL_MINT_AUTHORITY: deployer.publicKey.toBase58(),
      USDC_MINT_AUTHORITY: deployer.publicKey.toBase58(),
      banks_initialized: true
    }

    // Save to public directory for Next.js
    const configPath = path.join(process.cwd(), 'public', 'anchor', 'banks-config.json')
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    console.log('✅ Bank setup complete! Config saved to', configPath)

    // Mint test tokens to the user
    console.log(`🚰 Minting test tokens to user: ${userWalletAddress}`)

    await mintTokensToUser(
      connection,
      deployer,
      SOL_MINT,
      USDC_MINT,
      userWalletAddress
    )

    console.log('✅ Test tokens minted to user successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Bank setup completed successfully!',
      config: config
    })

  } catch (error) {
    console.error('❌ Bank setup failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

async function initializeAndFundBank(
  connection: Connection,
  deployer: Keypair,
  deployerSigner: KeyPairSigner,
  usdcMint: PublicKey,
  solMint: PublicKey,
  amount: number,
  tokenName: string
) {
  const mint = tokenName === 'SOL' ? solMint : usdcMint;

  // 1. Initialize the bank
  const bankIx = await getInitializeBankInstructionAsync({
    signer: deployerSigner,
    mint: address(mint.toString()),
    liquidationThreshold: 80, // 80%
    maxLtv: 70, // 70%
  })

  const web3BankIx = {
    keys: bankIx.accounts.map((acc: { address: string }, index: number) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: index === 0,
      isWritable: index === 0 || index === 2 || index === 3
    })),
    programId: new PublicKey(bankIx.programAddress),
    data: Buffer.from(bankIx.data)
  }

  const bankTx = new Transaction().add(web3BankIx)
  const { blockhash } = await connection.getLatestBlockhash()
  bankTx.recentBlockhash = blockhash
  bankTx.feePayer = deployer.publicKey
  bankTx.sign(deployer)

  const bankSig = await sendAndConfirmTransaction(connection, bankTx, [deployer])
  console.log(`✅ ${tokenName} Bank initialized: ${bankSig}`)

  // 2. Create deployer's token account and mint tokens
  const deployerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    deployer,
    mint,
    deployer.publicKey
  )

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

  // 3. Initialize deployer user account
  try {
    const userAccountIx = await getInitializeAccountInstructionAsync({
      signer: deployerSigner
    })

    const web3UserAccountIx = {
      keys: userAccountIx.accounts.map((acc: { address: string }, index: number) => ({
        pubkey: new PublicKey(acc.address),
        isSigner: index === 0,
        isWritable: index === 0 || index === 1
      })),
      programId: new PublicKey(userAccountIx.programAddress),
      data: Buffer.from(userAccountIx.data)
    }

    const userAccountTx = new Transaction().add(web3UserAccountIx)
    const { blockhash: userBlockhash } = await connection.getLatestBlockhash()
    userAccountTx.recentBlockhash = userBlockhash
    userAccountTx.feePayer = deployer.publicKey
    userAccountTx.sign(deployer)

    const userAccountSig = await sendAndConfirmTransaction(connection, userAccountTx, [deployer])
    console.log(`✅ Deployer user account initialized: ${userAccountSig}`)
  } catch {
    console.log(`ℹ️  Deployer user account may already exist, continuing...`)
  }

  // 4. Deposit tokens into the bank
  console.log(`💰 Depositing ${displayAmount} ${tokenName} into bank...`)

  const PROGRAM_ID = "9CoY42r3y5WFDJjQX97e9m9THcVGpvuVSKjBjGkiksMR"

  const [derivedBankAddress] = PublicKey.findProgramAddressSync(
    [mint.toBuffer()],
    new PublicKey(PROGRAM_ID)
  )

  const [derivedBankTokenAccountAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("Treasury"), mint.toBuffer()],
    new PublicKey(PROGRAM_ID)
  )

  const [derivedUserAccountAddress] = PublicKey.findProgramAddressSync(
    [deployer.publicKey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  )

  const derivedUserTokenAccount = await getAssociatedTokenAddress(mint, deployer.publicKey)

  const depositIx = await getDepositInstructionAsync({
    signer: deployerSigner,
    mint: address(mint.toString()),
    bank: address(derivedBankAddress.toString()),
    bankTokenAccount: address(derivedBankTokenAccountAddress.toString()),
    userAccount: address(derivedUserAccountAddress.toString()),
    userTokenAccount: address(derivedUserTokenAccount.toString()),
    amountToDeposit: amount,
    tokenType: tokenName === 'SOL' ? TokenType.SOL : TokenType.USDC
  })

    const web3DepositIx = {
      keys: depositIx.accounts.map((acc: { address: string }, index: number) => ({
        pubkey: new PublicKey(acc.address),
        isSigner: index === 0,
        isWritable: index === 0 || index === 2 || index === 3 || index === 4 || index === 5
      })),
    programId: new PublicKey(depositIx.programAddress),
    data: Buffer.from(depositIx.data)
  }

  const depositTx = new Transaction().add(web3DepositIx)
  const { blockhash: depositBlockhash } = await connection.getLatestBlockhash()
  depositTx.recentBlockhash = depositBlockhash
  depositTx.feePayer = deployer.publicKey
  depositTx.sign(deployer)

  const depositSig = await sendAndConfirmTransaction(connection, depositTx, [deployer])
  console.log(`✅ ${tokenName} deposited into bank: ${depositSig}`)
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
    50 * LAMPORTS_PER_SOL
  )
  console.log('✅ Minted 50 SOL to user')

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