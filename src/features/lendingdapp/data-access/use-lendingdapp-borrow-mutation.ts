import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useSolana } from '@/components/solana/use-solana'
import { address } from 'gill'
import { getBorrowInstructionAsync } from '@project/anchor'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'

export function useLendingdappBorrowMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const queryClient = useQueryClient()
  const signer = useWalletUiSigner({ account })

  return useMutation({
    mutationFn: async ({ amount, priceUpdate }: { amount: number; priceUpdate: string }) => {
      try {
        const connection = new Connection('http://127.0.0.1:8899', 'confirmed')

        const gillIx = await getBorrowInstructionAsync({
          signer,
          mint: address(NATIVE_MINT.toString()),
          priceUpdate: address(priceUpdate),
          amountToBorrow: BigInt(Math.floor(amount * 1_000_000_000)),
        })

        const web3Ix = new TransactionInstruction({
          keys: gillIx.accounts.map((acc: any, i: number) => ({
            pubkey: new PublicKey(acc.address),
            isSigner: i === 0,
            isWritable: [0, 2, 3, 4, 5].includes(i), // signer, bank, bank_token_account, user_account, user_token_account
          })),
          programId: new PublicKey(gillIx.programAddress),
          data: Buffer.from(gillIx.data),
        })

        const tx = new Transaction().add(web3Ix)
        const { blockhash } = await connection.getLatestBlockhash()
        tx.recentBlockhash = blockhash
        const phantom = (window as any).solana
        if (!phantom?.publicKey) throw new Error('Wallet not connected')
        tx.feePayer = phantom.publicKey

        const signedTx = await phantom.signTransaction(tx)
        const signature = await connection.sendRawTransaction(signedTx.serialize())
        await connection.confirmTransaction(signature, 'confirmed')
        return signature
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Borrow tx error:', e)
        throw e
      }
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'user', { cluster }] })
    },
    onError: (e) => toast.error(`Borrow failed: ${e instanceof Error ? e.message : String(e)}`),
  })
}