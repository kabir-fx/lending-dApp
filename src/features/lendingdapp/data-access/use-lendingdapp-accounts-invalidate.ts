import { useQueryClient } from '@tanstack/react-query'
import { useLendingdappAccountsQueryKey } from './use-lendingdapp-accounts-query-key'

export function useLendingdappAccountsInvalidate() {
  const queryClient = useQueryClient()
  const queryKey = useLendingdappAccountsQueryKey()

  return () => queryClient.invalidateQueries({ queryKey })
}
