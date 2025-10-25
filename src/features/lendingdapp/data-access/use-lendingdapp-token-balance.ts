import { useQuery } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount } from '@wallet-ui/react'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { useBanksConfig } from './use-bank-config'

export function useLendingdappTokenBalance({ account, token }: { account: UiWalletAccount; token: 'SOL' | 'USDC' }) {
  const { cluster } = useSolana()
  const banksConfig = useBanksConfig()

  return useQuery({
    queryKey: ['lendingdapp', 'token-balance', account.address, token, { cluster }],
    queryFn: async () => {
      if (!banksConfig) return 0

      const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
      const mintAddress = token === 'SOL'
        ? banksConfig.config.SOL_MINT
        : banksConfig.config.USDC_MINT

      try {
        // Get the associated token account for this user and mint
        const associatedTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(mintAddress),
          new PublicKey(account.address)
        )

        // Get the token account info
        const tokenAccountInfo = await getAccount(connection, associatedTokenAccount)

        // Return balance in human readable format
        const balance = Number(tokenAccountInfo.amount)
        return token === 'SOL' ? balance / 1_000_000_000 : balance / 1_000_000
      } catch (error) {
        // Token account doesn't exist or has no balance
        console.log(`No ${token} balance found:`, error)
        return 0
      }
    },
    enabled: !!banksConfig && !!account.address,
    staleTime: 10000, // 10 seconds
  })
}
