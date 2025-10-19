import { LendingdappAccount, getDecrementInstruction } from '@project/anchor'
import { useMutation } from '@tanstack/react-query'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { toastTx } from '@/components/toast-tx'
import { useLendingdappAccountsInvalidate } from './use-lendingdapp-accounts-invalidate'

export function useLendingdappDecrementMutation({
  account,
  lendingdapp,
}: {
  account: UiWalletAccount
  lendingdapp: LendingdappAccount
}) {
  const invalidateAccounts = useLendingdappAccountsInvalidate()
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()

  return useMutation({
    mutationFn: async () => await signAndSend(getDecrementInstruction({ lendingdapp: lendingdapp.address }), signer),
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}
