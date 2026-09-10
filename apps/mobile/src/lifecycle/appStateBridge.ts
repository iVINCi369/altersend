import { AppState, type AppStateStatus } from 'react-native'
import { setAppActive } from '@ruqa/domain'

let started = false
let subscription: { remove: () => void } | null = null

export function startAppStateBridge(): () => void {
  if (started) return () => {}
  started = true

  setAppActive(AppState.currentState === 'active')

  subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
    setAppActive(next === 'active')
  })

  return () => {
    started = false
    subscription?.remove()
    subscription = null
  }
}
