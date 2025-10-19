import { LendingdappAccount } from '@project/anchor'
import { ellipsify, UiWalletAccount } from '@wallet-ui/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { LendingdappUiButtonClose } from './lendingdapp-ui-button-close'
import { LendingdappUiButtonDecrement } from './lendingdapp-ui-button-decrement'
import { LendingdappUiButtonIncrement } from './lendingdapp-ui-button-increment'
import { LendingdappUiButtonSet } from './lendingdapp-ui-button-set'

export function LendingdappUiCard({ account, lendingdapp }: { account: UiWalletAccount; lendingdapp: LendingdappAccount }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lendingdapp: {lendingdapp.data.count}</CardTitle>
        <CardDescription>
          Account: <AppExplorerLink address={lendingdapp.address} label={ellipsify(lendingdapp.address)} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 justify-evenly">
          <LendingdappUiButtonIncrement account={account} lendingdapp={lendingdapp} />
          <LendingdappUiButtonSet account={account} lendingdapp={lendingdapp} />
          <LendingdappUiButtonDecrement account={account} lendingdapp={lendingdapp} />
          <LendingdappUiButtonClose account={account} lendingdapp={lendingdapp} />
        </div>
      </CardContent>
    </Card>
  )
}
