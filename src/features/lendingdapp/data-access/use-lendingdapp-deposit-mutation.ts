import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSolana } from '@/components/solana/use-solana'
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react'
import { getDepositInstructionAsync } from '@project/anchor'
import { toastTx } from '@/components/toast-tx'
import { toast } from 'sonner'
import { address } from 'gill'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { useEffect, useState } from 'react'

// Load config from the setup script
function useBanksConfig() {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    fetch('/anchor/banks-config.json')
      .then(res => res.json())
      .then(setConfig)
      .catch(() => setConfig(null))
  }, [])

  return config
}

export function useLendingdappDepositMutation({ account }: { account: UiWalletAccount }) {
  const { cluster } = useSolana()
  const queryClient = useQueryClient()
  const signer = useWalletUiSigner({ account })
  const banksConfig = useBanksConfig()

  return useMutation({
    mutationFn: async ({ amount, token }: { amount: number; token: 'SOL' | 'USDC' }) => {
      console.log('Deposit mutation called with:', { amount, token, banksConfig })

      if (!banksConfig) {
        throw new Error('Bank config not loaded')
      }

      try {
        const connection = new Connection('http://127.0.0.1:8899', 'confirmed')

        const mintAddress = address(token === 'SOL' ? banksConfig.SOL_MINT : banksConfig.USDC_MINT)
        const amountInSmallestUnit = BigInt(Math.floor(amount * (token === 'SOL' ? 1_000_000_000 : 1_000_000)))

        console.log('Using mint address:', mintAddress, 'amount:', amountInSmallestUnit)

        const gillIx = await getDepositInstructionAsync({
          signer,
          mint: mintAddress,
          amountToDeposit: amountInSmallestUnit
        })

        console.log('Instruction generated:', gillIx)

        const web3Ix = new TransactionInstruction({
          keys: gillIx.accounts.map((acc: any, i: number) => ({
            pubkey: new PublicKey(acc.address),
            isSigner: i === 0,
            isWritable: [0, 2, 3, 4, 5].includes(i), // signer, bank, bank_token_account, user_account, user_token_account
          })),
          programId: new PublicKey(gillIx.programAddress),
          data: Buffer.from(gillIx.data),
        })

        const tx = new Transaction().add(web3Ix)
        const { blockhash } = await connection.getLatestBlockhash()
        tx.recentBlockhash = blockhash
        const phantom = (window as any).solana
        if (!phantom?.publicKey) throw new Error('Wallet not connected')
        tx.feePayer = phantom.publicKey

        const signedTx = await phantom.signTransaction(tx)
        const signature = await connection.sendRawTransaction(signedTx.serialize())
        await connection.confirmTransaction(signature, 'confirmed')
        return signature
      } catch (e) {
        console.error('Deposit tx error:', e)
        throw e
      }
    },
    onSuccess: async (tx) => {
      toastTx(tx)
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'user', { cluster }] })
      await queryClient.invalidateQueries({ queryKey: ['lendingdapp', 'banks', { cluster }] })
    },
    onError: (error) => {
      console.error('Deposit error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to deposit: ${errorMessage}`)
    },
  })
}