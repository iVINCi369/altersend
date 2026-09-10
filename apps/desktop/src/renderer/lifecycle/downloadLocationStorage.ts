const ASK_KEY = 'ruqa.downloads.askEveryTime'

export function isAskEveryTime(): boolean {
  try {
    return window.localStorage.getItem(ASK_KEY) === '1'
  } catch {
    return false
  }
}

export function setAskEveryTime(value: boolean): void {
  try {
    window.localStorage.setItem(ASK_KEY, value ? '1' : '0')
  } catch {}
}
