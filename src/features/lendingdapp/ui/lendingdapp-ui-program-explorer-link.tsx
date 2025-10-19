import { LENDINGDAPP_PROGRAM_ADDRESS } from '@project/anchor'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { ellipsify } from '@wallet-ui/react'

export function LendingdappUiProgramExplorerLink() {
  return <AppExplorerLink address={LENDINGDAPP_PROGRAM_ADDRESS} label={ellipsify(LENDINGDAPP_PROGRAM_ADDRESS)} />
}
