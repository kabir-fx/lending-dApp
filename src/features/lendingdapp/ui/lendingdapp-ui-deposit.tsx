import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount } from '@wallet-ui/react'
import { useState } from 'react'
import { useLendingdappDepositMutation } from '../data-access/use-lendingdapp-deposit-mutation'

export function LendingdappUiDeposit({ account }: { account: UiWalletAccount }) {
  const [amount, setAmount] = useState('')
  const mutation = useLendingdappDepositMutation({ account })

  return (
    <div className="space-y-2">
      <Label htmlFor="deposit-amount">Deposit SOL</Label>
      <div className="flex gap-2">
        <Input
          id="deposit-amount"
          type="number"
          placeholder="Amount in SOL"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button 
          onClick={() => mutation.mutateAsync(parseFloat(amount))}
          disabled={mutation.isPending || !amount}
        >
          Deposit {mutation.isPending && '...'}
        </Button>
      </div>
    </div>
  )
}
