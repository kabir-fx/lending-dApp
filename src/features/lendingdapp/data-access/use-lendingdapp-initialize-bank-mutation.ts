import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount } from '@wallet-ui/react'
import { toast } from 'sonner'

export function useLendingdappInitializeBankMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      console.log('🚀 Starting complete bank setup process...')

      // Call the API route that handles the full setup
      const response = await fetch('/api/setup-banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWalletAddress: account.address,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to setup banks')
      }

      if (!result.success) {
        throw new Error(result.error || 'Bank setup failed')
      }

      console.log('✅ Bank setup completed successfully!')
      return result
    },
    onSuccess: async () => {
      // Wait a moment for the config to be updated and blockchain to be ready
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'banks', { cluster }] })
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'user', { cluster }] })

      toast.success('Lending protocol setup completed successfully! 🎉')
      toast.info('Banks are now ready for lending and borrowing operations.')
    },
    onError: (error) => {
      console.error('Bank setup error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)

      toast.error(`Deploy the anchor program first!!: ${errorMessage}`)
    },
  })
}