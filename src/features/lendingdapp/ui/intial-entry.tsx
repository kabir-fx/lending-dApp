import { Button } from '@/components/ui/button'
import { UiWalletAccount } from '@wallet-ui/react'
import { useLendingdappInitializeBankMutation } from '../data-access/use-lendingdapp-initialize-bank-mutation'
import { AppHero } from '@/components/app-hero'
import { useLendingdappBanksQuery } from '../data-access/use-lendingdapp-banks-query'

export function InitialEntry({ account }: { account: UiWalletAccount }) {
  const { error: banksError } = useLendingdappBanksQuery()
  const bankMutation = useLendingdappInitializeBankMutation({ account })

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
                <p>The lending protocol has not been set up yet.</p>
                <p>Click the button below to automatically create mints, initialize banks, and fund them with initial liquidity.</p>
              </>
            )}

            <Button
              onClick={() => bankMutation.mutateAsync()}
              disabled={bankMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-md transition-colors text-lg"
            >
              {bankMutation.isPending ? 'Setting up Lending Protocol...' : 'Setup Lending Protocol'}
            </Button>
          </div>
        </AppHero>
    </div>
  )
}
