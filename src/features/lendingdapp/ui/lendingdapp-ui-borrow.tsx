import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount } from '@wallet-ui/react'
import { useState } from 'react'
import { useLendingdappBorrowMutation } from '../data-access/use-lendingdapp-borrow-mutation'

export function LendingdappUiBorrow({ account }: { account: UiWalletAccount }) {
  const [amount, setAmount] = useState('')
  const mutation = useLendingdappBorrowMutation({ account })

  // For now, use a placeholder price update account
  // In a real implementation, this would come from a Pyth oracle
  const priceUpdateAccount = '11111111111111111111111111111112' // Placeholder

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="borrow-amount" className="text-sm font-medium">Amount</Label>
        <Input
          id="borrow-amount"
          type="number"
          placeholder="Enter SOL amount to borrow"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full"
          min="0"
          step="0.01"
        />
        <p className="text-xs text-gray-500">Requires sufficient collateral</p>
      </div>

      <Button
        onClick={() => mutation.mutateAsync({ amount: parseFloat(amount), priceUpdate: priceUpdateAccount })}
        disabled={mutation.isPending || !amount || parseFloat(amount) <= 0}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        {mutation.isPending ? 'Borrowing...' : 'Borrow SOL'}
      </Button>
    </div>
  )
}