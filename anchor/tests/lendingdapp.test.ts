import {
  Blockhash,
  createSolanaClient,
  createTransaction,
  generateKeyPairSigner,
  Instruction,
  isSolanaError,
  KeyPairSigner,
  signTransactionMessageWithSigners,
} from 'gill'
import {
  fetchLendingdapp,
  getCloseInstruction,
  getDecrementInstruction,
  getIncrementInstruction,
  getInitializeInstruction,
  getSetInstruction,
} from '../src'
// @ts-ignore error TS2307 suggest setting `moduleResolution` but this is already configured
import { loadKeypairSignerFromFile } from 'gill/node'

const { rpc, sendAndConfirmTransaction } = createSolanaClient({ urlOrMoniker: process.env.ANCHOR_PROVIDER_URL! })

describe('lendingdapp', () => {
  let payer: KeyPairSigner
  let lendingdapp: KeyPairSigner

  beforeAll(async () => {
    lendingdapp = await generateKeyPairSigner()
    payer = await loadKeypairSignerFromFile(process.env.ANCHOR_WALLET!)
  })

  it('Initialize Lendingdapp', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getInitializeInstruction({ payer: payer, lendingdapp: lendingdapp })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSER
    const currentLendingdapp = await fetchLendingdapp(rpc, lendingdapp.address)
    expect(currentLendingdapp.data.count).toEqual(0)
  })

  it('Increment Lendingdapp', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getIncrementInstruction({
      lendingdapp: lendingdapp.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchLendingdapp(rpc, lendingdapp.address)
    expect(currentCount.data.count).toEqual(1)
  })

  it('Increment Lendingdapp Again', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getIncrementInstruction({ lendingdapp: lendingdapp.address })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchLendingdapp(rpc, lendingdapp.address)
    expect(currentCount.data.count).toEqual(2)
  })

  it('Decrement Lendingdapp', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getDecrementInstruction({
      lendingdapp: lendingdapp.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchLendingdapp(rpc, lendingdapp.address)
    expect(currentCount.data.count).toEqual(1)
  })

  it('Set lendingdapp value', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getSetInstruction({ lendingdapp: lendingdapp.address, value: 42 })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchLendingdapp(rpc, lendingdapp.address)
    expect(currentCount.data.count).toEqual(42)
  })

  it('Set close the lendingdapp account', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getCloseInstruction({
      payer: payer,
      lendingdapp: lendingdapp.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    try {
      await fetchLendingdapp(rpc, lendingdapp.address)
    } catch (e) {
      if (!isSolanaError(e)) {
        throw new Error(`Unexpected error: ${e}`)
      }
      expect(e.message).toEqual(`Account not found at address: ${lendingdapp.address}`)
    }
  })
})

// Helper function to keep the tests DRY
let latestBlockhash: Awaited<ReturnType<typeof getLatestBlockhash>> | undefined
async function getLatestBlockhash(): Promise<Readonly<{ blockhash: Blockhash; lastValidBlockHeight: bigint }>> {
  if (latestBlockhash) {
    return latestBlockhash
  }
  return await rpc
    .getLatestBlockhash()
    .send()
    .then(({ value }) => value)
}
async function sendAndConfirm({ ix, payer }: { ix: Instruction; payer: KeyPairSigner }) {
  const tx = createTransaction({
    feePayer: payer,
    instructions: [ix],
    version: 'legacy',
    latestBlockhash: await getLatestBlockhash(),
  })
  const signedTransaction = await signTransactionMessageWithSigners(tx)
  return await sendAndConfirmTransaction(signedTransaction)
}
