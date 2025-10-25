import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount } from '@wallet-ui/react'
import { useState } from 'react'
import { useLendingdappDepositMutation } from '../data-access/use-lendingdapp-deposit-mutation'
import { useLendingdappTokenBalance } from '../data-access/use-lendingdapp-token-balance'

export function LendingdappUiDeposit({ account }: { account: UiWalletAccount }) {
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<'SOL' | 'USDC'>('SOL')

  // Mutation hook handles the actual deposit logic
  const mutation = useLendingdappDepositMutation({ account })

  // Get user's token balance for validation
  const { data: balance } = useLendingdappTokenBalance({ account, token: selectedToken })

  return (
    <div className="space-y-4">
      {/* Token Selector */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setSelectedToken('SOL')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${selectedToken === 'SOL'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          SOL
        </button>
        <button
          onClick={() => setSelectedToken('USDC')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${selectedToken === 'USDC'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          USDC
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="deposit-amount" className="text-sm font-medium">Amount</Label>
          <span className="text-xs text-gray-500">
            Balance: {balance !== undefined ? balance.toFixed(selectedToken === 'SOL' ? 9 : 6) : '...'} {selectedToken}
          </span>
        </div>
        <Input
          id="deposit-amount"
          type="number"
          placeholder={`Enter ${selectedToken} amount`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full"
          min="0"
          step={selectedToken === 'SOL' ? '0.001' : '0.1'}
          max={balance || 0}
        />
        {balance !== undefined && balance === 0 && (
          <p className="text-xs text-red-500">
            You don&apos;t have any test {selectedToken} tokens. Run <code className="bg-red-100 px-1 rounded">npm run faucet {account.address}</code> to get test tokens.
          </p>
        )}
      </div>

      <Button
        onClick={() => mutation.mutateAsync({ amount: parseFloat(amount), token: selectedToken })}
        disabled={
          mutation.isPending ||
          !amount ||
          parseFloat(amount) <= 0 ||
          (balance !== undefined && parseFloat(amount) > balance)
        }
        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        {mutation.isPending ? 'Depositing...' : `Deposit ${selectedToken}`}
      </Button>
    </div>
  )
}
