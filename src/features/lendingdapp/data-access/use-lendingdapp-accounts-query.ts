import { useSolana } from '@/components/solana/use-solana'
import { useQuery } from '@tanstack/react-query'
import { getLendingdappProgramAccounts } from '@project/anchor'
import { useLendingdappAccountsQueryKey } from './use-lendingdapp-accounts-query-key'

export function useLendingdappAccountsQuery() {
  const { client } = useSolana()

  return useQuery({
    queryKey: useLendingdappAccountsQueryKey(),
    queryFn: async () => await getLendingdappProgramAccounts(client.rpc),
  })
}
