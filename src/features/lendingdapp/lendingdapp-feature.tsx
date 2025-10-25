import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LendingdappUiInitializeAccount } from './ui/lendingdapp-ui-initialize-account'
import { LendingdappUiDashboard } from './ui/lendingdapp-ui-dashboard'
import { useLendingdappUserAccount } from './data-access/use-lendingdapp-user-account'
import { useLendingdappBanksQuery } from './data-access/use-lendingdapp-banks-query'
import { InitialEntry } from './ui/initial-entry'
import { useBanksConfig } from './data-access/use-bank-config'

export default function LendingdappFeature() {
  const { account } = useSolana()
  const { data: userAccount } = useLendingdappUserAccount(account?.address)
  const { data: banks, isLoading: banksLoading, error: banksError } = useLendingdappBanksQuery()
  const { config: banksConfig, error: banksConfigError } = useBanksConfig()

  // Show loading if banks are still loading (this includes waiting for config)
  if (banksLoading) {
    return (
      <div>
        <AppHero
          title="Lending Protocol"
          subtitle="Loading banks..."
        >
          <div className="text-center">
            <p>Please wait while we load the lending banks...</p>
          </div>
        </AppHero>
      </div>
    )
  }

  // Show setup UI if banks config doesn't exist or banks query failed or no banks exist
  if (!banksConfig || banksConfigError || banksError || (banks && banks.length === 0)) {
    return (
      account ? (
        <div>
          <InitialEntry account={account} />
        </div>
      ) : (
        <WalletDropdown />
      )
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
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Initialize Your Account</CardTitle>
                <p className="text-sm text-gray-600">Create your lending protocol account to start using the platform</p>
              </CardHeader>
              <CardContent>
                <LendingdappUiInitializeAccount account={account} />
              </CardContent>
            </Card>
          </div>
        ) : userAccount ? (
          <div className="max-w-6xl mx-auto">
            <LendingdappUiDashboard
              account={account}
              userAccount={{
                depositedSol: Number(userAccount.depositedSol || 0n),
                borrowedSol: Number(userAccount.borrowedSol || 0n),
                depositedUsdc: Number(userAccount.depositedUsdc || 0n),
                borrowedUsdc: Number(userAccount.borrowedUsdc || 0n),
              }}
            />
          </div>
        ) : null}
      </AppHero>
    </div>
  )
}