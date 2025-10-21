import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LendingdappUiInitializeAccount } from './ui/lendingdapp-ui-initialize-account'
import { LendingdappUiDashboard } from './ui/lendingdapp-ui-dashboard'
import { useLendingdappUserAccount } from './data-access/use-lendingdapp-user-account'
import { useLendingdappBanksQuery } from './data-access/use-lendingdapp-banks-query'

export default function LendingdappFeature() {
  const { account } = useSolana()
  const { data: userAccount } = useLendingdappUserAccount(account?.address)
  const { data: banks, isLoading: banksLoading, error: banksError } = useLendingdappBanksQuery()

  console.log('LendingdappFeature - userAccount:', userAccount)
  console.log('LendingdappFeature - banks:', banks)

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

  // Show error if banks query failed or no banks exist after loading is complete
  if (banksError || (banks && banks.length === 0)) {
    return (
      <div>
        <AppHero
          title="Lending Protocol"
          subtitle="Banks not available"
        >
          <div className="text-center space-y-4">
            {banksError ? (
              <>
                <p>Error loading banks: {banksError.message}</p>
                <p>Please check your connection and try again.</p>
              </>
            ) : (
              <>
                <p>The lending protocol banks haven't been set up yet.</p>
                <p>Please run <code className="bg-gray-100 px-2 py-1 rounded">npm run setup-banks</code> first.</p>
              </>
            )}
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

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Get Test Tokens</CardTitle>
                <p className="text-sm text-gray-600">To test the lending protocol, you need some test tokens</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    The setup script created custom SOL and USDC tokens for testing. Use the faucet command to get test tokens:
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <p className="text-gray-800">npm run faucet {account.address}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">What this does:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Mints 5 SOL worth of custom tokens to your wallet</li>
                    <li>Mints 1000 USDC worth of custom tokens to your wallet</li>
                    <li>Run this command in a terminal where the project is set up</li>
                  </ul>
                  <p className="text-sm text-green-600 font-medium mt-2">
                    ✅ You can now deposit and withdraw both SOL and USDC tokens!
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> These are custom tokens created specifically for this lending protocol demo.
                    They are not real SOL or USDC and only work within this test environment.
                  </p>
                </div>
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