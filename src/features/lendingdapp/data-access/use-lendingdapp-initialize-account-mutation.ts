import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { getInitializeAccountInstructionAsync } from '@project/anchor'
import { toastTx } from '@/components/toast-tx'
import { toast } from 'sonner'
import { NATIVE_MINT } from '@solana/spl-token'
import { address } from 'gill'
import { useEffect, useState } from 'react'

// Load config from the setup script
function useBanksConfig() {
  const [config, setConfig] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/anchor/banks-config.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then(data => {
        setConfig(data)
        setError(null)
      })
      .catch(err => {
        console.error('Failed to load banks config:', err)
        setError(err.message)
        setConfig(null)
      })
  }, [])

  return { config, error }
}

export function useLendingdappInitializeAccountMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const queryClient = useQueryClient()
  const signer = useWalletUiSigner({ account })
  const signAndSend = useWalletUiSignAndSend()
  const { config: banksConfig } = useBanksConfig()

  return useMutation({
    mutationFn: async () => {
      if (!banksConfig?.USDC_MINT) {
        throw new Error('USDC mint not found in banks config')
      }

      const instruction = await getInitializeAccountInstructionAsync({
        signer,
        usdcAddress: address(banksConfig.USDC_MINT)
      })
      return await signAndSend(instruction, signer)
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'user', { cluster }] })
    },
    onError: (error) => {
      console.error('Initialize account error:', error)
      toast.error(`Failed to initialize account: ${error instanceof Error ? error.message : String(error)}`)
    },
  })
}
