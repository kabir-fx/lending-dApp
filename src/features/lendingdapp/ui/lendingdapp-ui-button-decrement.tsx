import { LendingdappAccount } from '@project/anchor'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'

import { useLendingdappDecrementMutation } from '../data-access/use-lendingdapp-decrement-mutation'

export function LendingdappUiButtonDecrement({ account, lendingdapp }: { account: UiWalletAccount; lendingdapp: LendingdappAccount }) {
  const decrementMutation = useLendingdappDecrementMutation({ account, lendingdapp })

  return (
    <Button variant="outline" onClick={() => decrementMutation.mutateAsync()} disabled={decrementMutation.isPending}>
      Decrement
    </Button>
  )
}
