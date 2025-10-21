import { useSolana } from '@/components/solana/use-solana'
import { useQuery } from '@tanstack/react-query'
import { address, getProgramDerivedAddress, getAddressEncoder } from 'gill'
import { fetchBank } from '@project/anchor'
import { LENDING_PROTOCOL_PROGRAM_ADDRESS } from '@project/anchor'
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

export function useLendingdappBanksQuery() {
  const { cluster, client } = useSolana()
  const { rpc } = client
  const { config: banksConfig, error: configError } = useBanksConfig()

  return useQuery({
    queryKey: ['lendingdapp', 'banks', { cluster }],
    queryFn: async () => {
      const banks = []

      // SOL Bank (using custom SOL token from config)
      if (banksConfig?.SOL_MINT) {
        try {
          const solMintAddress = address(banksConfig.SOL_MINT)
          const [solBankAddress] = await getProgramDerivedAddress({
            programAddress: LENDING_PROTOCOL_PROGRAM_ADDRESS,
            seeds: [getAddressEncoder().encode(solMintAddress)],
          })
          const solBank = await fetchBank(rpc, solBankAddress)
          banks.push({
            mint: banksConfig.SOL_MINT,
            ...solBank.data,
            type: 'SOL'
          })
        } catch (e) {
          console.error('SOL Bank fetch error:', e)
        }
      }

      // USDC Bank
      if (banksConfig?.USDC_MINT) {
        try {
          const usdcMintAddress = address(banksConfig.USDC_MINT)
          const [usdcBankAddress] = await getProgramDerivedAddress({
            programAddress: LENDING_PROTOCOL_PROGRAM_ADDRESS,
            seeds: [getAddressEncoder().encode(usdcMintAddress)],
          })
          const usdcBank = await fetchBank(rpc, usdcBankAddress)
          banks.push({
            mint: banksConfig.USDC_MINT,
            ...usdcBank.data,
            type: 'USDC'
          })
        } catch (e) {
          console.error('USDC Bank fetch error:', e)
        }
      }

      return banks
    },
    enabled: !!banksConfig, // Only run if banks have been set up
    staleTime: 30000, // 30 seconds
  })
}
