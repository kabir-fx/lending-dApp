import { Button } from '@/components/ui/button'
import { UiWalletAccount } from '@wallet-ui/react'
import { useLendingdappInitializeAccountMutation } from '../data-access/use-lendingdapp-initialize-account-mutation'

export function LendingdappUiInitializeAccount({ account }: { account: UiWalletAccount }) {
  const mutation = useLendingdappInitializeAccountMutation({ account })

  return (
    <Button
      onClick={() => mutation.mutateAsync()}
      disabled={mutation.isPending}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-md transition-colors text-lg"
    >
      {mutation.isPending ? 'Initializing Account...' : 'Initialize User Account'}
    </Button>
  )
}