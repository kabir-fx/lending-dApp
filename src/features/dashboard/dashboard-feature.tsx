'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'
import { useLendingdappBanksQuery } from '@/features/lendingdapp/data-access/use-lendingdapp-banks-query'
import { UserAccount } from '../lendingdapp/ui/lendingdapp-ui-dashboard'
import { Button } from '@/components/ui/button'

export default function DashboardFeature({ userAccount }: { userAccount: UserAccount }) {
  const { data: banks } = useLendingdappBanksQuery()

  return (
    <div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Available Liquidity</CardTitle>
        </CardHeader>
        <CardContent>
          {banks?.length ? (
            <div className="space-y-4">
              {banks.map((bank) => (
                <div key={bank.mint} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">{bank.type} Pool</div>
                      <div className="text-lg text-gray-600">
                        {Number((bank.totalDeposits - bank.totalBorrows)) / (bank.type === 'SOL' ? 1_000_000_000 : 1_000_000)} {bank.type}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Total Deposits: {Number(bank.totalDeposits) / (bank.type === 'SOL' ? 1_000_000_000 : 1_000_000)} {bank.type}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Available</div>
                      <div className="text-sm font-medium text-green-600">Active</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-pulse">
                Loading bank data...
                <br />
              </div>
                Go to Actions page to initialize the banks
            </div>
          )}
        </CardContent>
      </Card>

      <br />

      <div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Your Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6"> {/* Two columns with larger gaps */}
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="text-sm text-blue-600 font-medium mb-2">Deposited SOL</div>
                <div className="text-2xl font-bold text-blue-900">
                  {(userAccount.depositedSol / 1_000_000_000).toFixed(9)} SOL
                </div>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <div className="text-sm text-red-600 font-medium mb-2">Borrowed SOL</div>
                <div className="text-2xl font-bold text-red-900">
                  {(userAccount.borrowedSol / 1_000_000_000).toFixed(9)} SOL
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <div className="text-sm text-green-600 font-medium mb-2">Deposited USDC</div>
                <div className="text-2xl font-bold text-green-900">
                  {(userAccount.depositedUsdc / 1_000_000).toFixed(9)} USDC
                </div>
              </div>

              <div className="bg-orange-50 p-6 rounded-lg">
                <div className="text-sm text-orange-600 font-medium mb-2">Borrowed USDC</div>
                <div className="text-2xl font-bold text-orange-900">
                  {(userAccount.borrowedUsdc / 1_000_000).toFixed(9)} USDC
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
