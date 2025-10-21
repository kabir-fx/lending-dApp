import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount } from '@wallet-ui/react'
import { useState } from 'react'
import { useLendingdappWithdrawMutation } from '../data-access/use-lendingdapp-withdraw-mutation'

export function LendingdappUiWithdraw({ account }: { account: UiWalletAccount }) {
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<'SOL' | 'USDC'>('SOL')
  const mutation = useLendingdappWithdrawMutation({ account })

  return (
    <div className="space-y-4">
      {/* Token Selector */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setSelectedToken('SOL')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            selectedToken === 'SOL'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          SOL
        </button>
        <button
          onClick={() => setSelectedToken('USDC')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            selectedToken === 'USDC'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          USDC
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="withdraw-amount" className="text-sm font-medium">Amount</Label>
        <Input
          id="withdraw-amount"
          type="number"
          placeholder={`Enter ${selectedToken} amount to withdraw`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full"
          min="0"
          step={selectedToken === 'SOL' ? '0.01' : '0.1'}
        />
      </div>

      <Button
        onClick={() => mutation.mutateAsync({ amount: parseFloat(amount), token: selectedToken })}
        disabled={mutation.isPending || !amount || parseFloat(amount) <= 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        {mutation.isPending ? 'Withdrawing...' : `Withdraw ${selectedToken}`}
      </Button>
    </div>
  )
}



