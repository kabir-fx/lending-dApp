import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount } from '@wallet-ui/react'
import { useState } from 'react'
import { useLendingdappBorrowMutation } from '../data-access/use-lendingdapp-borrow-mutation'

export function LendingdappUiBorrow({ account }: { account: UiWalletAccount }) {
  const [amount, setAmount] = useState('')
  const [priceUpdate, setPriceUpdate] = useState('')
  const mutation = useLendingdappBorrowMutation({ account })

  return (
    <div className="space-y-2">
      <Label htmlFor="borrow-amount">Borrow SOL</Label>
      <div className="flex gap-2">
        <Input
          id="borrow-amount"
          type="number"
          placeholder="Amount in SOL"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          id="price-update"
          type="text"
          placeholder="PriceUpdate account (Pyth Receiver)"
          value={priceUpdate}
          onChange={(e) => setPriceUpdate(e.target.value)}
        />
        <Button onClick={() => mutation.mutateAsync({ amount: parseFloat(amount), priceUpdate })} disabled={mutation.isPending || !amount || !priceUpdate}>
          Borrow {mutation.isPending && '...'}
        </Button>
      </div>
    </div>
  )
}