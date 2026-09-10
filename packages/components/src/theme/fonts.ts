export type FontFamilyKey =
  | 'latin'
  | 'japanese'
  | 'korean'
  | 'simplifiedChinese'
  | 'traditionalChinese'

export interface BundledFontFamily {
  cssFamily: string
  nativeFamily?: string
  assetFileName?: string
  boldAssetFileName?: string
}

export const DEFAULT_FONT_FAMILY_KEY: FontFamilyKey = 'latin'
export const LATIN_FONT_FAMILY_CSS =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, system-ui, sans-serif'
export const MONO_FONT_FAMILY_CSS =
  'ui-monospace, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace'
export const MONO_FONT_FAMILY_NATIVE = {
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace'
} as const

export const BUNDLED_FONT_FAMILIES: Record<FontFamilyKey, BundledFontFamily> = {
  latin: {
    cssFamily: LATIN_FONT_FAMILY_CSS
  },
  japanese: {
    cssFamily: 'Ruqa Sans JP',
    nativeFamily: 'Ruqa Sans JP',
    assetFileName: 'NotoSans-JP-Regular.ttf',
    boldAssetFileName: 'NotoSans-JP-Bold.ttf'
  },
  korean: {
    cssFamily: 'Ruqa Sans KR',
    nativeFamily: 'Ruqa Sans KR',
    assetFileName: 'NotoSans-KR-Regular.ttf',
    boldAssetFileName: 'NotoSans-KR-Bold.ttf'
  },
  simplifiedChinese: {
    cssFamily: 'Ruqa Sans SC',
    nativeFamily: 'Ruqa Sans SC',
    assetFileName: 'NotoSans-SC-Regular.ttf',
    boldAssetFileName: 'NotoSans-SC-Bold.ttf'
  },
  traditionalChinese: {
    cssFamily: 'Ruqa Sans TC',
    nativeFamily: 'Ruqa Sans TC',
    assetFileName: 'NotoSans-TC-Regular.ttf',
    boldAssetFileName: 'NotoSans-TC-Bold.ttf'
  }
} as const

export function getNativeFontFamilyName(fontFamily: FontFamilyKey): string | undefined {
  return BUNDLED_FONT_FAMILIES[fontFamily]?.nativeFamily
}
