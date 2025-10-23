import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UiWalletAccount } from '@wallet-ui/react'
import { LendingdappUiBorrow } from './lendingdapp-ui-borrow'
import { LendingdappUiWithdraw } from './lendingdapp-ui-withdraw'
import { LendingdappUiDeposit } from './lendingdapp-ui-deposit'
import { useLendingdappBanksQuery } from '../data-access/use-lendingdapp-banks-query'

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
  const { data: banks } = useLendingdappBanksQuery()

  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Your Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Deposited SOL</div>
                <div className="text-2xl font-bold text-blue-900">
                  {(userAccount.depositedSol / 1_000_000_000).toFixed(9)} SOL
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Borrowed SOL</div>
                <div className="text-2xl font-bold text-red-900">
                  {(userAccount.borrowedSol / 1_000_000_000).toFixed(9)} SOL
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Deposited USDC</div>
                <div className="text-2xl font-bold text-green-900">
                  {(userAccount.depositedUsdc / 1_000_000).toFixed(9)} USDC
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Borrowed USDC</div>
                <div className="text-2xl font-bold text-orange-900">
                  {(userAccount.borrowedUsdc / 1_000_000).toFixed(9)} USDC
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Available Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            {banks?.length ? (
              <div className="space-y-4">
                {banks.map((bank) => (
                  <div key={bank.mint} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600">{bank.type} Pool</div>
                        <div className="text-lg font-semibold">
                          {Number((bank.totalDeposits - bank.totalBorrows))} {bank.type}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Total Deposits: {Number(bank.totalDeposits) / (bank.type === 'SOL' ? 1_000_000_000 : 1_000_000)} {bank.type}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Available</div>
                        <div className="text-sm font-medium text-green-600">Active</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-pulse">Loading bank data...</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions Section */}
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Actions</CardTitle>
          <p className="text-sm text-gray-600">Manage your deposits, withdrawals, and borrowing</p>
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
              You can now deposit and withdraw both SOL and USDC tokens. Borrow functionality is coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
