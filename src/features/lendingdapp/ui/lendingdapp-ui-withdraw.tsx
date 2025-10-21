import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount } from '@wallet-ui/react'
import { useState } from 'react'
import { useLendingdappWithdrawMutation } from '../data-access/use-lendingdapp-withdraw-mutation'

export function LendingdappUiWithdraw({ account }: { account: UiWalletAccount }) {
  const [amount, setAmount] = useState('')
  const mutation = useLendingdappWithdrawMutation({ account })

  return (
    <div className="space-y-2">
      <Label htmlFor="withdraw-amount">Withdraw SOL</Label>
      <div className="flex gap-2">
        <Input
          id="withdraw-amount"
          type="number"
          placeholder="Amount in SOL"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button
          onClick={() => mutation.mutateAsync(parseFloat(amount))}
          disabled={mutation.isPending || !amount}
        >
          Withdraw {mutation.isPending && '...'}
        </Button>
      </div>
    </div>
  )
}



