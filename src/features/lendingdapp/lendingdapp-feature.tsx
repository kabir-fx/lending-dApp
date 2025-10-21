import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { LendingdappUiInitializeAccount } from './ui/lendingdapp-ui-initialize-account'
import { LendingdappUiDashboard } from './ui/lendingdapp-ui-dashboard'
import { useLendingdappUserAccount } from './data-access/use-lendingdapp-user-account'
import { useLendingdappBanksQuery } from './data-access/use-lendingdapp-banks-query'

export default function LendingdappFeature() {
  const { account } = useSolana()
  const { data: userAccount } = useLendingdappUserAccount(account?.address)
  const { data: banks, isLoading: banksLoading } = useLendingdappBanksQuery()

  // Show loading if banks aren't ready yet
  if (banksLoading) {
    return (
      <div>
        <AppHero
          title="Lending Protocol"
          subtitle="Setting up banks..."
        >
          <div className="text-center">
            <p>Please wait while we initialize the lending banks...</p>
          </div>
        </AppHero>
      </div>
    )
  }

  // Show error if no banks exist
  if (!banks || banks.length === 0) {
    return (
      <div>
        <AppHero
          title="Lending Protocol"
          subtitle="Banks not initialized"
        >
          <div className="text-center space-y-4">
            <p>The lending protocol banks haven't been set up yet.</p>
            <p>Please run <code className="bg-gray-100 px-2 py-1 rounded">npm run setup-banks</code> first.</p>
          </div>
        </AppHero>
      </div>
    )
  }

  return (
    <div>
      <AppHero
        title="Lending Protocol"
        subtitle={
          account
            ? "Manage your lending positions"
            : 'Connect wallet to start lending'
        }
      >
        {!account ? (
          <WalletDropdown />
        ) : !userAccount ? (
          <div className="space-y-6">
            <LendingdappUiInitializeAccount account={account} />
          </div>
        ) : userAccount ? (
          <LendingdappUiDashboard
            account={account}
            userAccount={{
              depositedSol: Number(userAccount.depositedSol),
              borrowedSol: Number(userAccount.borrowedSol),
              depositedUsdc: Number(userAccount.depositedUsdc),
              borrowedUsdc: Number(userAccount.borrowedUsdc),
            }}
          />
        ) : null}
      </AppHero>
    </div>
  )
}