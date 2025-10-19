import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UiWalletAccount } from '@wallet-ui/react'
// Action components will be added later; keep stubs to satisfy imports
const LendingdappUiDeposit = ({ account }: { account: UiWalletAccount }) => null
const LendingdappUiBorrow = ({ account }: { account: UiWalletAccount }) => null
const LendingdappUiRepay = ({ account }: { account: UiWalletAccount }) => null
const LendingdappUiWithdraw = ({ account }: { account: UiWalletAccount }) => null

interface UserAccount {
  depositedSol: number
  borrowedSol: number
  depositedUsdc: number
  borrowedUsdc: number
}

export function LendingdappUiDashboard({ 
  account, 
  userAccount 
}: { 
  account: UiWalletAccount
  userAccount: UserAccount 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>Deposited SOL: {userAccount.depositedSol / 1_000_000_000} SOL</div>
            <div>Borrowed SOL: {userAccount.borrowedSol / 1_000_000_000} SOL</div>
            <div>Deposited USDC: {userAccount.depositedUsdc / 1_000_000} USDC</div>
            <div>Borrowed USDC: {userAccount.borrowedUsdc / 1_000_000} USDC</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LendingdappUiDeposit account={account} />
          <LendingdappUiWithdraw account={account} />
          <LendingdappUiBorrow account={account} />
          <LendingdappUiRepay account={account} />
        </CardContent>
      </Card>
    </div>
  )
}
