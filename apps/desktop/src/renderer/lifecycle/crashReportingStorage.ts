const KEY = 'ruqa.crash-reporting.enabled'

export function isCrashReportingEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setCrashReportingEnabled(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch {}
}
