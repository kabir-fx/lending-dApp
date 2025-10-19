import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UiWalletAccount } from '@wallet-ui/react'
import { useState } from 'react'
import { useLendingdappInitializeBankMutation } from '../data-access/use-lendingdapp-initialize-mutation'

export function LendingUiInitializeBank({ account }: { account: UiWalletAccount }) {
  const [liquidationThreshold, setLiquidationThreshold] = useState('80')
  const [maxLtv, setMaxLtv] = useState('70')
  
  const mutation = useLendingdappInitializeBankMutation({ account })

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="threshold">Liquidation Threshold (%)</Label>
        <Input
          id="threshold"
          type="number"
          value={liquidationThreshold}
          onChange={(e) => setLiquidationThreshold(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="ltv">Max LTV (%)</Label>
        <Input
          id="ltv"
          type="number"
          value={maxLtv}
          onChange={(e) => setMaxLtv(e.target.value)}
        />
      </div>
      
      <Button 
        onClick={() => mutation.mutateAsync({ 
          liquidationThreshold: parseInt(liquidationThreshold), 
          maxLtv: parseInt(maxLtv) 
        })}
        disabled={mutation.isPending}
      >
        Initialize Bank {mutation.isPending && '...'}
      </Button>
    </div>
  )
}