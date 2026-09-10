import { css } from 'react-strict-dom'
import { fontTokens } from './tokens.css'
import type { FontFamilyKey } from './fonts'

type FontThemeStyle = ReturnType<typeof css.createTheme>

const latinFontThemeStyle = css.createTheme(fontTokens, {
  fontFamilySans:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, system-ui, sans-serif',
  fontFamilyDisplay:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, system-ui, sans-serif',
  fontFamilyMono:
    'ui-monospace, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace'
})

const japaneseFontThemeStyle = css.createTheme(fontTokens, {
  fontFamilySans: '"Ruqa Sans JP"',
  fontFamilyDisplay: '"Ruqa Sans JP"',
  fontFamilyMono:
    'ui-monospace, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace'
})

const koreanFontThemeStyle = css.createTheme(fontTokens, {
  fontFamilySans: '"Ruqa Sans KR"',
  fontFamilyDisplay: '"Ruqa Sans KR"',
  fontFamilyMono:
    'ui-monospace, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace'
})

const simplifiedChineseFontThemeStyle = css.createTheme(fontTokens, {
  fontFamilySans: '"Ruqa Sans SC"',
  fontFamilyDisplay: '"Ruqa Sans SC"',
  fontFamilyMono:
    'ui-monospace, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace'
})

const traditionalChineseFontThemeStyle = css.createTheme(fontTokens, {
  fontFamilySans: '"Ruqa Sans TC"',
  fontFamilyDisplay: '"Ruqa Sans TC"',
  fontFamilyMono:
    'ui-monospace, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace'
})

export const fontThemeStyles = {
  latin: latinFontThemeStyle,
  japanese: japaneseFontThemeStyle,
  korean: koreanFontThemeStyle,
  simplifiedChinese: simplifiedChineseFontThemeStyle,
  traditionalChinese: traditionalChineseFontThemeStyle
} satisfies Record<FontFamilyKey, FontThemeStyle>
