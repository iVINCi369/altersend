import { canJoinFromDeepLink, extractJoinCode, joinSession } from '@ruqa/domain'
import { bridgeApi, hasBridge } from '../api/bridgeApi'

let started = false
let unsubscribe: (() => void) | null = null

export function startDeepLinkHandler(): () => void {
  if (started) return teardown
  if (!hasBridge()) return teardown
  started = true

  unsubscribe = bridgeApi.onDeepLink((url: string) => {
    if (!url.startsWith('ruqa://')) return
    const code = extractJoinCode(url)
    if (!code) return
    if (!canJoinFromDeepLink(code)) {
      console.warn('deepLinkHandler: ignoring incoming URL — session already active')
      return
    }
    void joinSession(code).catch((err) => {
      console.warn('deepLinkHandler: joinSession failed', err)
    })
  })

  return teardown
}

function teardown(): void {
  if (!started) return
  started = false
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}
