import { LendingdappUiCard } from './lendingdapp-ui-card'
import { useLendingdappAccountsQuery } from '@/features/lendingdapp/data-access/use-lendingdapp-accounts-query'
import { UiWalletAccount } from '@wallet-ui/react'

export function LendingdappUiList({ account }: { account: UiWalletAccount }) {
  const lendingdappAccountsQuery = useLendingdappAccountsQuery()

  if (lendingdappAccountsQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (!lendingdappAccountsQuery.data?.length) {
    return (
      <div className="text-center">
        <h2 className={'text-2xl'}>No accounts</h2>
        No accounts found. Initialize one to get started.
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {lendingdappAccountsQuery.data?.map((lendingdapp) => (
        <LendingdappUiCard account={account} key={lendingdapp.address} lendingdapp={lendingdapp} />
      ))}
    </div>
  )
}
