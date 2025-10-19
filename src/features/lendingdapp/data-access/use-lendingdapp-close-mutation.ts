import { LendingdappAccount, getCloseInstruction } from '@project/anchor'
import { useMutation } from '@tanstack/react-query'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { toastTx } from '@/components/toast-tx'
import { useLendingdappAccountsInvalidate } from './use-lendingdapp-accounts-invalidate'

export function useLendingdappCloseMutation({ account, lendingdapp }: { account: UiWalletAccount; lendingdapp: LendingdappAccount }) {
  const invalidateAccounts = useLendingdappAccountsInvalidate()
  const signAndSend = useWalletUiSignAndSend()
  const signer = useWalletUiSigner({ account })

  return useMutation({
    mutationFn: async () => {
      return await signAndSend(getCloseInstruction({ payer: signer, lendingdapp: lendingdapp.address }), signer)
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}
