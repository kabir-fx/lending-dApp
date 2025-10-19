import { LendingdappAccount } from '@project/anchor'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'

import { useLendingdappSetMutation } from '@/features/lendingdapp/data-access/use-lendingdapp-set-mutation'

export function LendingdappUiButtonSet({ account, lendingdapp }: { account: UiWalletAccount; lendingdapp: LendingdappAccount }) {
  const setMutation = useLendingdappSetMutation({ account, lendingdapp })

  return (
    <Button
      variant="outline"
      onClick={() => {
        const value = window.prompt('Set value to:', lendingdapp.data.count.toString() ?? '0')
        if (!value || parseInt(value) === lendingdapp.data.count || isNaN(parseInt(value))) {
          return
        }
        return setMutation.mutateAsync(parseInt(value))
      }}
      disabled={setMutation.isPending}
    >
      Set
    </Button>
  )
}
