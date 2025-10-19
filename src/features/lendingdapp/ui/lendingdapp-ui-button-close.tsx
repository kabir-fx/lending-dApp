import { LendingdappAccount } from '@project/anchor'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'

import { useLendingdappCloseMutation } from '@/features/lendingdapp/data-access/use-lendingdapp-close-mutation'

export function LendingdappUiButtonClose({ account, lendingdapp }: { account: UiWalletAccount; lendingdapp: LendingdappAccount }) {
  const closeMutation = useLendingdappCloseMutation({ account, lendingdapp })

  return (
    <Button
      variant="destructive"
      onClick={() => {
        if (!window.confirm('Are you sure you want to close this account?')) {
          return
        }
        return closeMutation.mutateAsync()
      }}
      disabled={closeMutation.isPending}
    >
      Close
    </Button>
  )
}
