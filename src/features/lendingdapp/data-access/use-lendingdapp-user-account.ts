import { useQuery } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { fetchUser, LENDING_PROTOCOL_PROGRAM_ADDRESS } from '@project/anchor'
import { address, getAddressEncoder, getProgramDerivedAddress } from 'gill'

export function useLendingdappUserAccount(userAddress: string | undefined) {
  const { client, cluster } = useSolana()
  
  return useQuery({
    queryKey: ['lendingdapp', 'user', userAddress, { cluster }],
    queryFn: async () => {
      if (!userAddress) return null
      const [userPda] = await getProgramDerivedAddress({
        programAddress: LENDING_PROTOCOL_PROGRAM_ADDRESS,
        seeds: [getAddressEncoder().encode(address(userAddress))],
      })
      try {
        const account = await fetchUser(client.rpc, userPda)
        return account.data
      } catch {
        return null
      }
    },
    enabled: !!userAddress,
  })
}
