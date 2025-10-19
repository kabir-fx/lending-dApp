import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { getDepositInstructionAsync } from '@project/anchor'
import { toastTx } from '@/components/toast-tx'
import { toast } from 'sonner'
import { NATIVE_MINT } from '@solana/spl-token'
import { address } from 'gill'

export function useLendingdappDepositMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const queryClient = useQueryClient()
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()

  return useMutation({
    mutationFn: async (amount: number) => {
      const instruction = await getDepositInstructionAsync({
        signer,
        mint: address(NATIVE_MINT.toString()),
        amountToDeposit: amount * 1_000_000_000 // Convert SOL to lamports
      })
      return await signAndSend(instruction, signer)
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'user', { cluster }] })
    },
    onError: () => toast.error('Failed to deposit'),
  })
}