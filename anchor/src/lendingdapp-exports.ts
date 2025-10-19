// Here we export some useful types and functions for interacting with the Anchor program.
import { Account, getBase58Decoder, SolanaClient } from 'gill'
import { getProgramAccountsDecoded } from './helpers/get-program-accounts-decoded'
import { Lendingdapp, LENDINGDAPP_DISCRIMINATOR, LENDINGDAPP_PROGRAM_ADDRESS, getLendingdappDecoder } from './client/js'
import LendingdappIDL from '../target/idl/lendingdapp.json'

export type LendingdappAccount = Account<Lendingdapp, string>

// Re-export the generated IDL and type
export { LendingdappIDL }

export * from './client/js'

export function getLendingdappProgramAccounts(rpc: SolanaClient['rpc']) {
  return getProgramAccountsDecoded(rpc, {
    decoder: getLendingdappDecoder(),
    filter: getBase58Decoder().decode(LENDINGDAPP_DISCRIMINATOR),
    programAddress: LENDINGDAPP_PROGRAM_ADDRESS,
  })
}
