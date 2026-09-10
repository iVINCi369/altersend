import {
  SYSTEM_THEME_PREFERENCE,
  normalizeThemePreference,
  type ThemePreference
} from '@ruqa/components'

const KEY = 'ruqa.theme.preference'

export function getSavedThemePreference(): ThemePreference {
  try {
    return normalizeThemePreference(window.localStorage.getItem(KEY))
  } catch {
    return SYSTEM_THEME_PREFERENCE
  }
}

export function setSavedThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(KEY, preference)
  } catch (error) {
    console.warn('Failed to save theme preference', error)
  }
}
