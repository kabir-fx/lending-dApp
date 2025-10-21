import { useSolana } from '@/components/solana/use-solana'
import { useQuery } from '@tanstack/react-query'
import { address, createSolanaClient } from 'gill'
import { fetchBank } from '@project/anchor'
import { NATIVE_MINT } from '@solana/spl-token'
import { useEffect, useState } from 'react'

// Load config from the setup script
function useBanksConfig() {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    fetch('/anchor/banks-config.json')
      .then(res => res.json())
      .then(setConfig)
      .catch(() => {
        // Config doesn't exist yet
        setConfig(null)
      })
  }, [])

  return config
}

export function useLendingdappBanksQuery() {
  const { cluster } = useSolana()
  const { rpc } = createSolanaClient({ urlOrMoniker: cluster as any })
  const banksConfig = useBanksConfig()

  return useQuery({
    queryKey: ['lendingdapp', 'banks', { cluster }],
    queryFn: async () => {
      const banks = []

      // SOL Bank (using custom SOL token from config)
      if (banksConfig?.SOL_MINT) {
        try {
          const solBankAddress = address(banksConfig.SOL_MINT)
          const solBank = await fetchBank(rpc, solBankAddress)
          banks.push({
            mint: banksConfig.SOL_MINT,
            ...solBank.data,
            type: 'SOL'
          })
        } catch (e) {
          console.warn('SOL Bank not found:', e)
        }
      }

      // USDC Bank
      if (banksConfig?.USDC_MINT) {
        try {
          const usdcBankAddress = address(banksConfig.USDC_MINT)
          const usdcBank = await fetchBank(rpc, usdcBankAddress)
          banks.push({
            mint: banksConfig.USDC_MINT,
            ...usdcBank.data,
            type: 'USDC'
          })
        } catch (e) {
          console.warn('USDC Bank not found:', e)
        }
      }

      return banks
    },
    enabled: !!banksConfig, // Only run if banks have been set up
    staleTime: 30000, // 30 seconds
  })
}
