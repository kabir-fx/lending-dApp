import { LendingdappAccount, getIncrementInstruction } from '@project/anchor'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { useMutation } from '@tanstack/react-query'
import { toastTx } from '@/components/toast-tx'
import { useLendingdappAccountsInvalidate } from './use-lendingdapp-accounts-invalidate'

export function useLendingdappIncrementMutation({
  account,
  lendingdapp,
}: {
  account: UiWalletAccount
  lendingdapp: LendingdappAccount
}) {
  const invalidateAccounts = useLendingdappAccountsInvalidate()
  const signAndSend = useWalletUiSignAndSend()
  const signer = useWalletUiSigner({ account })

  return useMutation({
    mutationFn: async () => await signAndSend(getIncrementInstruction({ lendingdapp: lendingdapp.address }), signer),
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}
