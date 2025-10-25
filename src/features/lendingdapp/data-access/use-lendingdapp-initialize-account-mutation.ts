import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { getInitializeAccountInstructionAsync } from '@project/anchor'
import { toastTx } from '@/components/toast-tx'
import { toast } from 'sonner'
import { useBanksConfig } from './use-bank-config'

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
      })
      return await signAndSend(instruction, signer)
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      
      // Wait a bit for the transaction to be confirmed on the blockchain
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Invalidate user account queries with the correct query key pattern
      await queryClient.invalidateQueries({ 
        queryKey: ['lendingdapp', 'user', account.address.toString(), { cluster }] 
      })
    },
    onError: (error) => {
      console.error('Initialize account error:', error)
      toast.error(`Failed to initialize account: ${error instanceof Error ? error.message : String(error)}`)
    },
  })
}