import { Button } from '@/components/ui/button'
import { UiWalletAccount } from '@wallet-ui/react'
import { useLendingdappInitializeBankMutation } from '../data-access/use-lendingdapp-initialize-bank-mutation'
import { AppHero } from '@/components/app-hero'
import { useLendingdappBanksQuery } from '../data-access/use-lendingdapp-banks-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export function InitialEntry({ account }: { account: UiWalletAccount }) {
  const { error: banksError } = useLendingdappBanksQuery()
  const bankMutation = useLendingdappInitializeBankMutation({ account })
  const [copied, setCopied] = useState(false)

  const copyCommand = async () => {
    const command = `npm run faucet ${account.address}`
    await navigator.clipboard.writeText(command)
    setCopied(true)
    toast.success('Command copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <AppHero
        title="Lending Protocol"
        subtitle="Banks not available"
      >
        <div className="text-center space-y-4">
          {banksError ? (
            <>
              <p>Error loading banks: {banksError.message}</p>
              <p>Please check your connection and try again.</p>
            </>
          ) : (
            <>
              <p>The lending protocol has not been set up yet.</p>
              <p>Click the button below to automatically create mints, initialize banks, and fund them with initial liquidity.</p>
            </>
          )}

          <Button
            onClick={async () => {
              await bankMutation.mutateAsync()
              window.location.reload()
            }}
            disabled={bankMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-md transition-colors text-lg"
          >
            {bankMutation.isPending ? 'Setting up Lending Protocol...' : 'Setup Lending Protocol'}
          </Button>
        </div>
        <br />
        
        <div>
        <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">OR</CardTitle>
                <CardDescription className="text-xl">Run this command in the terminal if the project is setup locally</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm flex items-center justify-between">
                  <p className="text-gray-800">npm run faucet {account.address}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={copyCommand}
                    className="ml-2 h-8 w-8 p-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">What this does:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 text-left">
                    <li>Initializes the SOL and USDC banks</li>
                    <li>Funds the banks with initial liquidity of 100 SOL and USDC each</li>
                    <li>Mints 50 SOL and 1000 USDC to your account</li>
                    <li>Run this command in a terminal where the project is set up</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-left">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> These are custom tokens created specifically for this lending protocol demo.
                    They are not real SOL or USDC and only work within this test environment.
                  </p>
                </div>
              </CardContent>
            </Card>
        </div>
      </AppHero>
    </div>
  )
}
