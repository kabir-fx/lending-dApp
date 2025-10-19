import { Button } from '@/components/ui/button'
import { UiWalletAccount } from '@wallet-ui/react'

import { useLendingdappInitializeMutation } from '@/features/lendingdapp/data-access/use-lendingdapp-initialize-mutation'

export function LendingdappUiButtonInitialize({ account }: { account: UiWalletAccount }) {
  const mutationInitialize = useLendingdappInitializeMutation({ account })

  return (
    <Button onClick={() => mutationInitialize.mutateAsync()} disabled={mutationInitialize.isPending}>
      Initialize Lendingdapp {mutationInitialize.isPending && '...'}
    </Button>
  )
}
