import { Button } from '@/components/ui/button'
import { UiWalletAccount } from '@wallet-ui/react'
import { useLendingdappInitializeAccountMutation } from '../data-access/use-lendingdapp-initialize-account-mutation'

export function LendingdappUiInitializeAccount({ account }: { account: UiWalletAccount }) {
  const mutation = useLendingdappInitializeAccountMutation({ account })

  return (
    <Button 
      onClick={() => mutation.mutateAsync()}
      disabled={mutation.isPending}
    >
      Initialize User Account {mutation.isPending && '...'}
    </Button>
  )
}