import { useSolana } from '@/components/solana/use-solana'
import { useQuery } from '@tanstack/react-query'
import { address, getProgramDerivedAddress, getAddressEncoder } from 'gill'
import { fetchMaybeBank } from '@project/anchor'
import { LENDING_PROTOCOL_PROGRAM_ADDRESS } from '@project/anchor'
import { useEffect, useState } from 'react'

// Load config from the setup script using a hook. The config file is static data that doesn't change, so we load it once and reuse it.
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
  // Get Solana connection
  const { cluster, client } = useSolana()
  // Get RPC client for blockchain calls
  const { rpc } = client
  // Get token addresses
  const { config: banksConfig } = useBanksConfig()
  
  /*
    React Query:
    - is like a smart cache for API calls
    - Automatically refetches when data changes
    - Provides loading states and error handling
  */ 
  return useQuery({
    // Unique cache key
    queryKey: ['lendingdapp', 'banks', { cluster }],
    
    // The actual data fetching logic
    queryFn: async () => {
      // Will store found banks
      const banks = []

      // SOL Bank (using custom SOL token from config)
      if (banksConfig?.SOL_MINT) {
        try {
          // Convert string to Solana address
          const solMintAddress = address(banksConfig.SOL_MINT)

          // Calculate where the SOL bank account should be (since PDAs can be deterministically calculated from: Program ID + Seeds)
          const [solBankAddress] = await getProgramDerivedAddress({
            programAddress: LENDING_PROTOCOL_PROGRAM_ADDRESS,
            
            // Bank PDA = [mint_address]
            seeds: [getAddressEncoder().encode(solMintAddress)],
          })
          
          // Try to fetch the bank account from blockchain, using fetchMaybeBank instead of fetchBank to avoid throwing when account doesn't exist
          const solBankAccount = await fetchMaybeBank(rpc, solBankAddress)
          
          // Only add to banks array if the account actually exists
          if (solBankAccount.exists) {
            banks.push({
              mint: banksConfig.SOL_MINT,
              // Spread the bank data (total deposits, etc.)
              ...solBankAccount.data,
              type: 'SOL'
            })
          } else {
            console.log('SOL Bank account does not exist yet')
          }
        } catch (e) {
          console.error('SOL Bank fetch error:', e)
        }
      }

      // USDC Bank with similar logic
      if (banksConfig?.USDC_MINT) {
        try {
          const usdcMintAddress = address(banksConfig.USDC_MINT)
          const [usdcBankAddress] = await getProgramDerivedAddress({
            programAddress: LENDING_PROTOCOL_PROGRAM_ADDRESS,
            seeds: [getAddressEncoder().encode(usdcMintAddress)],
          })
          
          const usdcBankAccount = await fetchMaybeBank(rpc, usdcBankAddress)
          
          if (usdcBankAccount.exists) {
            banks.push({
              mint: banksConfig.USDC_MINT,
              ...usdcBankAccount.data,
              type: 'USDC'
            })
          } else {
            console.log('USDC Bank account does not exist yet')
          }
        } catch (e) {
          console.error('USDC Bank fetch error:', e)
        }
      }

      return banks
    },
    
    // Only run if banks have been set up
    enabled: !!banksConfig,
    
    // Cache data for 30 seconds
    staleTime: 30000,

    // Add retry: false to prevent React Query from retrying failed queries
    retry: false,
  })
}