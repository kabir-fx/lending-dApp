import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { getDepositInstructionAsync, TokenType } from '@project/anchor'
import { toastTx } from '@/components/toast-tx'
import { toast } from 'sonner'
import { address } from 'gill'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { useBanksConfig } from './use-bank-config'

export function useLendingdappDepositMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const signer = useWalletUiSigner({ account })
  const banksConfig = useBanksConfig()
  
  // Manually refresh queries after mutation
  const queryClient = useQueryClient()

  /*
    Mutations are React Query's way of handling server state changes (like POST, PUT, DELETE operations). Unlike queries (which just fetch data), mutations:
    - Perform write operations (create, update, delete)
    - Have loading states while executing
    - Can optimistically update the UI before server confirms
    - Handle error states and retry logic
    - Can trigger side effects on success/error
*/
  return useMutation({
    mutationFn: async ({ amount, token }: { amount: number; token: 'SOL' | 'USDC' }) => {
      console.log('Deposit mutation called with:', { amount, token, banksConfig })

      if (!banksConfig) {
        throw new Error('Bank config not loaded')
      }

      try {
        const connection = new Connection('http://127.0.0.1:8899', 'confirmed')

        // Get mint address from config
        const mintAddress = address(token === 'SOL' ? banksConfig.config.SOL_MINT : banksConfig.config.USDC_MINT)

        // Convert amount to smallest units (SOL: 9 decimals, USDC: 6 decimals)
        const amountInSmallestUnit = BigInt(Math.floor(amount * (token === 'SOL' ? 1_000_000_000 : 1_000_000)))

        console.log('Using mint address:', mintAddress, 'amount:', amountInSmallestUnit)

        // Generate deposit instruction using Codama-generated functions
        const gillIx = await getDepositInstructionAsync({
          signer,
          mint: mintAddress,
          amountToDeposit: amountInSmallestUnit,
          tokenType: token === 'SOL' ? TokenType.SOL : TokenType.USDC
        })
        console.log('Instruction generated:', gillIx)

        // Convert Gill instruction to Web3.js TransactionInstruction
        const web3Ix = new TransactionInstruction({
          keys: gillIx.accounts.map((acc: any, i: number) => ({
            pubkey: new PublicKey(acc.address),
            isSigner: i === 0,
            // signer, bank, bank_token_account, user_account, user_token_account
            isWritable: [0, 2, 3, 4, 5].includes(i),
          })),
          programId: new PublicKey(gillIx.programAddress),
          data: Buffer.from(gillIx.data),
        })

        // Create and send transaction
        const tx = new Transaction().add(web3Ix)
        const { blockhash } = await connection.getLatestBlockhash()
        tx.recentBlockhash = blockhash

        // Use user's wallet to sign and send
        const userWallet = (window as any).solana
        if (!userWallet?.publicKey) throw new Error('Wallet not connected')
        tx.feePayer = userWallet.publicKey

        const signedTx = await userWallet.signTransaction(tx)
        const signature = await connection.sendRawTransaction(signedTx.serialize())
        
        // Wait for confirmation
        await connection.confirmTransaction({
          signature,
          ...(await connection.getLatestBlockhash())
        })

        return signature
      } catch (e) {
        console.error('Deposit tx error:', e)
        throw e
      }
    },
    
    // Shows a success toast with transaction link
    onSuccess: async (tx) => {
      // Show success notification with explorer link
      toastTx(tx)

      // Invalidates queries to refresh user balance and bank data on the UI after successful deposit
      await queryClient.invalidateQueries({ 
        queryKey: ['lendingdapp', 'user', account.address.toString(), { cluster }] 
      })
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'banks', { cluster }] })

      window.location.reload()
    },
    onError: (error) => {
      console.error('Deposit error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to deposit: ${errorMessage}`)
    },
  })
}