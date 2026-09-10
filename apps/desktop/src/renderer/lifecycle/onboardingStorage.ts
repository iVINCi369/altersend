const KEY = 'ruqa.onboarding.completed'

export function isOnboardingCompleted(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingCompleted(): void {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {}
}
