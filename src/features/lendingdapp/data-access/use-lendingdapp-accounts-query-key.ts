import { useSolana } from '@/components/solana/use-solana'

export function useLendingdappAccountsQueryKey() {
  const { cluster } = useSolana()

  return ['lendingdapp', 'accounts', { cluster }]
}
