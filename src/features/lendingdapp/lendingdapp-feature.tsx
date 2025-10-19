import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { LendingUiInitializeBank as LendingdappUiInitializeBank } from './ui/lendingdapp-ui-initialize-bank'
import { LendingdappUiInitializeAccount } from './ui/lendingdapp-ui-initialize-account'
import { LendingdappUiDashboard } from './ui/lendingdapp-ui-dashboard'
import { useLendingdappUserAccount } from './data-access/use-lendingdapp-user-account'

export default function LendingdappFeature() {
  const { account } = useSolana()
  const { data: userAccount } = useLendingdappUserAccount(account?.address)

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
            <LendingdappUiInitializeBank account={account} />
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