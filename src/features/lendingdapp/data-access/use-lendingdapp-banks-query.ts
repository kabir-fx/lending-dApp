import { useSolana } from '@/components/solana/use-solana'
import { useQuery } from '@tanstack/react-query'
import { address, getProgramDerivedAddress, getAddressEncoder, fetchEncodedAccount } from 'gill'
import { Bank, fetchMaybeBank } from '@project/anchor'
import { LENDING_PROTOCOL_PROGRAM_ADDRESS } from '@project/anchor'
import { useBanksConfig } from './use-bank-config'

async function confirmBankExists(
  mint: string,
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  banks: Array<{ mint: string, type: string } & Bank>,
  currency: string
) {
  // Convert string to Solana address
  const bankMintAddress = address(mint)

  // Calculate where the given bank account should be (since PDAs can be deterministically calculated from: Program ID + Seeds)
  const [bankAddress] = await getProgramDerivedAddress({
    programAddress: LENDING_PROTOCOL_PROGRAM_ADDRESS,

    // Bank PDA = [mint_address]
    seeds: [getAddressEncoder().encode(bankMintAddress)],
  })

  // Try to fetch the bank account from blockchain, using fetchMaybeBank instead of fetchBank to avoid throwing when account doesn't exist
  const bankAccount = await fetchMaybeBank(rpc, bankAddress)

  // Only add to banks array if the account actually exists
  if (bankAccount.exists) {
    banks.push({
      mint: mint,
      // Spread the bank data (total deposits, etc.)
      ...bankAccount.data,
      type: currency
    })
  } else {
    console.log(currency + ' Bank account does not exist yet')
  }
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
      const banks: Array<{
        mint: string,
        type: string
      } & Bank> = []

      // SOL Bank (using custom SOL token from config)
      if (banksConfig?.SOL_MINT) {
        try {
          await confirmBankExists(banksConfig.SOL_MINT, rpc, banks, 'SOL');
          console.log('SOL Bank found!!')
        } catch (e) {
          console.error('SOL Bank fetch error:', e)
        }
      }

      // USDC Bank with similar logic
      if (banksConfig?.USDC_MINT) {
        try {
          await confirmBankExists(banksConfig.USDC_MINT, rpc, banks, 'USDC')
          console.log('USDC Bank found!!')

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