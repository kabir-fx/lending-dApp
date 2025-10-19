import { LendingdappAccount } from '@project/anchor'
import { UiWalletAccount } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { useLendingdappIncrementMutation } from '../data-access/use-lendingdapp-increment-mutation'

export function LendingdappUiButtonIncrement({ account, lendingdapp }: { account: UiWalletAccount; lendingdapp: LendingdappAccount }) {
  const incrementMutation = useLendingdappIncrementMutation({ account, lendingdapp })

  return (
    <Button variant="outline" onClick={() => incrementMutation.mutateAsync()} disabled={incrementMutation.isPending}>
      Increment
    </Button>
  )
}
