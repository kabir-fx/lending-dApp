import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UiWalletAccount } from '@wallet-ui/react'
import { LendingdappUiBorrow } from './lendingdapp-ui-borrow'
import { LendingdappUiWithdraw } from './lendingdapp-ui-withdraw'
import { LendingdappUiDeposit } from './lendingdapp-ui-deposit'

export interface UserAccount {
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
    <div className="space-y-8">
      {/* Actions Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-green-700">Deposit Tokens</h3>
              <p className="text-sm text-gray-600 mb-4">Add SOL or USDC to earn interest</p>
              <LendingdappUiDeposit account={account} />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700">Withdraw Tokens</h3>
              <p className="text-sm text-gray-600 mb-4">Remove your deposited SOL or USDC</p>
              <LendingdappUiWithdraw account={account} userAccount={userAccount} />
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">✅ Full Functionality Available</h4>
            <p className="text-sm text-green-700">
              You can now deposit and withdraw both SOL and USDC tokens. Borrowing and liquidating functionalities are coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
