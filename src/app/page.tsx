'use client'

import DashboardFeature from '@/features/dashboard/dashboard-feature'
import { useLendingdappUserAccount } from '@/features/lendingdapp/data-access/use-lendingdapp-user-account'
import { useSolana } from '@/components/solana/use-solana'

export default function Home() {
  const { account } = useSolana()
  const { data: userAccount } = useLendingdappUserAccount(account?.address)

  const userAccountData = userAccount ? {
    depositedSol: Number(userAccount.depositedSol || 0n),
    borrowedSol: Number(userAccount.borrowedSol || 0n),
    depositedUsdc: Number(userAccount.depositedUsdc || 0n),
    borrowedUsdc: Number(userAccount.borrowedUsdc || 0n),
  } : {
    depositedSol: 0,
    borrowedSol: 0,
    depositedUsdc: 0,
    borrowedUsdc: 0,
  }

  return <DashboardFeature userAccount={userAccountData} />
}
