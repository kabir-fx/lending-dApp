import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UiWalletAccount } from '@wallet-ui/react'
import { LendingdappUiBorrow } from './lendingdapp-ui-borrow'
import { LendingdappUiWithdraw } from './lendingdapp-ui-withdraw'
import { useLendingdappBanksQuery } from '../data-access/use-lendingdapp-banks-query'
// Keep deposit/repay for later wiring if needed
const LendingdappUiDeposit = ({ account }: { account: UiWalletAccount }) => null
const LendingdappUiRepay = ({ account }: { account: UiWalletAccount }) => null

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
  const { data: banks } = useLendingdappBanksQuery()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <CardTitle>Available Liquidity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {banks?.map((bank) => (
              <div key={bank.mint} className="flex justify-between">
                <span>{bank.type} Available:</span>
                <span className="font-mono">
                  {(bank.totalDeposits - bank.totalBorrows) /
                    (bank.type === 'SOL' ? 1_000_000_000 : 1_000_000)} {bank.type}
                </span>
              </div>
            ))}
            {!banks?.length && (
              <div className="text-gray-500">Loading bank data...</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* <LendingdappUiDeposit account={account} /> */}
          <LendingdappUiWithdraw account={account} />
          <LendingdappUiBorrow account={account} />
          {/* <LendingdappUiRepay account={account} /> */}
        </CardContent>
      </Card>
    </div>
  )
}
