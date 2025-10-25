import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { address } from 'gill'
import { getInitializeAccountInstructionAsync, getInitializeBankInstructionAsync } from '@project/anchor'
import { toastTx } from '@/components/toast-tx'
import { toast } from 'sonner'
import { NATIVE_MINT, getAssociatedTokenAddress } from '@solana/spl-token'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { createMintToInstruction } from '@solana/spl-token'
import { useEffect, useState } from 'react'
import { AccountMeta, AccountSignerMeta } from 'gill'

interface PhantomWallet {
  publicKey: PublicKey
  signTransaction: (transaction: Transaction) => Promise<Transaction>
}

declare global {
  interface Window {
    solana?: PhantomWallet
  }
}

interface BanksConfig {
  SOL_MINT: string
  USDC_MINT: string
  SOL_MINT_AUTHORITY: string
  USDC_MINT_AUTHORITY: string
  banks_initialized: boolean
}

// A mutation is a function that changes data on the blockchain. It's like a "write" operation.
// mutation hook for initializing the lendingdapp
export function useLendingdappInitializeBankMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const queryClient = useQueryClient()
  const signer = useWalletUiSigner({ account })

  // It returns a mutation object with these properties:
  return useMutation({
    mutationFn: async ({ liquidationThreshold, maxLtv }: { liquidationThreshold: number, maxLtv: number }) => {
      try {
        // Create web3.js Connection
        const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
        
        // Build instruction
        const gillInstruction = await getInitializeBankInstructionAsync({
          signer,
          mint: address(NATIVE_MINT.toString()),
          liquidationThreshold,
          maxLtv,
        })

        // Convert gill instruction to web3.js TransactionInstruction.
        // IMPORTANT: Only the first account (signer) should be a signer.
        // Writable accounts for initialize_bank are: signer (0), bank (2), bank_token_account (3)
        const web3Instruction = new TransactionInstruction({
          keys: gillInstruction.accounts.map((acc: AccountMeta | AccountSignerMeta, i: number) => ({
            pubkey: new PublicKey(acc.address),
            isSigner: i === 0,
            isWritable: i === 0 || i === 2 || i === 3,
          })),
          programId: new PublicKey(gillInstruction.programAddress),
          data: Buffer.from(gillInstruction.data),
        })

        // Build transaction
        const tx = new Transaction().add(web3Instruction)
        const { blockhash } = await connection.getLatestBlockhash()
        tx.recentBlockhash = blockhash
        const phantom = window.solana
        if (!phantom?.publicKey) throw new Error('Wallet not connected')
        tx.feePayer = phantom.publicKey

        // Sign and send using wallet
        const signedTx = await phantom.signTransaction(tx)
        const signature = await connection.sendRawTransaction(signedTx.serialize())
        await connection.confirmTransaction(signature, 'confirmed')
        
        return signature
      } catch (error) {
        console.error('Initialize bank transaction error:', error)
        throw error
      }
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'banks', { cluster }] })
    },
    onError: (e) => {
      console.error('Initialize bank error:', e)
      toast.error(`Failed to initialize bank: ${e instanceof Error ? e.message : String(e)}`)
    },
  })
}

export function useLendingdappInitializeAccountMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const queryClient = useQueryClient()
  const signer = useWalletUiSigner({ account })

  // It returns a mutation object with these properties:
  return useMutation({
    mutationFn: async () => {
      try {
        // Create web3.js Connection
        const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
        
        const gillInstruction = await getInitializeAccountInstructionAsync({
          signer,
        })

        // Convert gill instruction to web3.js TransactionInstruction.
        const web3Instruction = new TransactionInstruction({
          keys: gillInstruction.accounts.map((acc: AccountMeta | AccountSignerMeta, i: number) => ({
            pubkey: new PublicKey(acc.address),
            isSigner: i === 0,
            isWritable: i === 0 || i === 2 || i === 3,
          })),
          programId: new PublicKey(gillInstruction.programAddress),
          data: Buffer.from(gillInstruction.data),
        })

        // Build transaction
        const tx = new Transaction().add(web3Instruction)
        const { blockhash } = await connection.getLatestBlockhash()
        tx.recentBlockhash = blockhash
        const phantom = window.solana
        if (!phantom?.publicKey) throw new Error('Wallet not connected')
        tx.feePayer = phantom.publicKey

        // Sign and send using wallet
        const signedTx = await phantom.signTransaction(tx)
        const signature = await connection.sendRawTransaction(signedTx.serialize())
        await connection.confirmTransaction(signature, 'confirmed')
        
        return signature
      } catch (error) {
        console.error('Initialize account transaction error:', error)
        throw error
      }
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'accounts', { cluster }] })
    },
    onError: (e) => {
      console.error('Initialize account error:', e)
      toast.error(`Failed to initialize account: ${e instanceof Error ? e.message : String(e)}`)
    },
  })
}

// Load config from the setup script
function useBanksConfig() {
  const [config, setConfig] = useState<BanksConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/anchor/banks-config.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then(data => {
        setConfig(data)
        setError(null)
      })
      .catch(err => {
        console.error('Failed to load banks config:', err)
        setError(err.message)
        setConfig(null)
      })
  }, [])

  return { config, error }
}

export function useLendingdappTokenAirdropMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const queryClient = useQueryClient()
  const signer = useWalletUiSigner({ account })
  const { config: banksConfig } = useBanksConfig()

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!banksConfig?.SOL_MINT || !banksConfig?.USDC_MINT) {
        throw new Error('Bank config not found')
      }

      const connection = new Connection('http://127.0.0.1:8899', 'confirmed')

      // Create instructions to mint SOL and USDC tokens
      const instructions = []

      const signerPublicKey = new PublicKey(signer.address);

      // Mint SOL tokens
      const solMintIx = createMintToInstruction(
        new PublicKey(banksConfig.SOL_MINT),
        await getAssociatedTokenAddress(new PublicKey(banksConfig.SOL_MINT), signerPublicKey),
        signerPublicKey,
        BigInt(Math.round(amount * 1_000_000_000)) // amount in lamports
      )
      instructions.push(solMintIx)

      // Mint USDC tokens
      const usdcMintIx = createMintToInstruction(
        new PublicKey(banksConfig.USDC_MINT),
        await getAssociatedTokenAddress(new PublicKey(banksConfig.USDC_MINT), signerPublicKey),
        signerPublicKey,
        BigInt(Math.round(amount * 1_000_000)) // amount in smallest unit
      )
      instructions.push(usdcMintIx)

      // Send transaction
      const tx = new Transaction().add(...instructions)
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = signerPublicKey

      const phantom = window.solana
      if (!phantom?.publicKey) throw new Error('Wallet not connected')
      const signedTx = await phantom.signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')
      return signature
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'user', { cluster }] })
      toast.success(`Airdropped ${tx ? 'tokens' : 'failed'}`)
    },
    onError: (error) => {
      console.error('Token airdrop error:', error)
      toast.error(`Failed to airdrop tokens: ${error instanceof Error ? error.message : String(error)}`)
    },
  })
}