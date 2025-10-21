import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { address } from 'gill'
import { getInitializeAccountInstructionAsync, getInitializeBankInstructionAsync } from '@project/anchor'
import { toastTx } from '@/components/toast-tx'
import { toast } from 'sonner'
import { NATIVE_MINT } from '@solana/spl-token'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { createMintToInstruction } from '@solana/spl-token'
import { useEffect, useState } from 'react'

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
          keys: gillInstruction.accounts.map((acc: any, i: number) => ({
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
        const phantom = (window as any).solana
        if (!phantom?.publicKey) throw new Error('Wallet not connected')
        tx.feePayer = phantom.publicKey

        // Sign and send using wallet
        const signedTx = await (window as any).solana.signTransaction(tx)
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
      // Surface the actual error for easier debugging in UI
      // eslint-disable-next-line no-console
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
          usdcAddress: address(NATIVE_MINT.toString()),
        })

        // Convert gill instruction to web3.js TransactionInstruction.
        const web3Instruction = new TransactionInstruction({
          keys: gillInstruction.accounts.map((acc: any, i: number) => ({
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
        const phantom = (window as any).solana
        if (!phantom?.publicKey) throw new Error('Wallet not connected')
        tx.feePayer = phantom.publicKey

        // Sign and send using wallet
        const signedTx = await (window as any).solana.signTransaction(tx)
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
      // eslint-disable-next-line no-console
      console.error('Initialize account error:', e)
      toast.error(`Failed to initialize account: ${e instanceof Error ? e.message : String(e)}`)
    },
  })
}

// Load config from the setup script
function useBanksConfig() {
  const [config, setConfig] = useState<any>(null)
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
  const signAndSend = useWalletUiSignAndSend()
  const { config: banksConfig } = useBanksConfig()

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!banksConfig?.SOL_MINT || !banksConfig?.USDC_MINT) {
        throw new Error('Bank config not found')
      }

      const connection = new Connection('http://127.0.0.1:8899', 'confirmed')

      // Create instructions to mint SOL and USDC tokens
      const instructions = []

      // Mint SOL tokens
      const solMintIx = createMintToInstruction(
        new PublicKey(banksConfig.SOL_MINT),
        await signer.getAssociatedTokenAddress(new PublicKey(banksConfig.SOL_MINT)),
        signer.address,
        BigInt(Math.round(amount * 1_000_000_000)) // amount in lamports
      )
      instructions.push(solMintIx)

      // Mint USDC tokens
      const usdcMintIx = createMintToInstruction(
        new PublicKey(banksConfig.USDC_MINT),
        await signer.getAssociatedTokenAddress(new PublicKey(banksConfig.USDC_MINT)),
        signer.address,
        BigInt(Math.round(amount * 1_000_000)) // amount in smallest unit
      )
      instructions.push(usdcMintIx)

      // Send transaction
      const tx = new Transaction().add(...instructions)
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = signer.address

      const signedTx = await signAndSend(tx, signer)
      return signedTx
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
