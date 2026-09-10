import { DEFAULT_LOCALE } from '@ruqa/locales'

export function getDesktopSystemLocales(): string[] {
  if (typeof navigator === 'undefined') return [DEFAULT_LOCALE]
  const languages = navigator.languages?.filter(Boolean)
  if (languages && languages.length > 0) return [...languages]
  return navigator.language ? [navigator.language] : [DEFAULT_LOCALE]
}
