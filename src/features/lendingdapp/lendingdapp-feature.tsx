import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { LendingdappUiButtonInitialize } from './ui/lendingdapp-ui-button-initialize'
import { LendingdappUiList } from './ui/lendingdapp-ui-list'
import { LendingdappUiProgramExplorerLink } from './ui/lendingdapp-ui-program-explorer-link'
import { LendingdappUiProgramGuard } from './ui/lendingdapp-ui-program-guard'

export default function LendingdappFeature() {
  const { account } = useSolana()

  return (
    <LendingdappUiProgramGuard>
      <AppHero
        title="Lendingdapp"
        subtitle={
          account
            ? "Initialize a new lendingdapp onchain by clicking the button. Use the program's methods (increment, decrement, set, and close) to change the state of the account."
            : 'Select a wallet to run the program.'
        }
      >
        <p className="mb-6">
          <LendingdappUiProgramExplorerLink />
        </p>
        {account ? (
          <LendingdappUiButtonInitialize account={account} />
        ) : (
          <div style={{ display: 'inline-block' }}>
            <WalletDropdown />
          </div>
        )}
      </AppHero>
      {account ? <LendingdappUiList account={account} /> : null}
    </LendingdappUiProgramGuard>
  )
}
