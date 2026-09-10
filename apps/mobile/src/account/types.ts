import type { AccountModel } from '@ruqa/domain'

export interface AccountPhaseProps {
  model: AccountModel
  errorText: string | null
  onDismiss: () => void
}
