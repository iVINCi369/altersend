import { useTheme } from '@ruqa/components'
import { Button, Host } from '@expo/ui/swift-ui'
import {
  buttonStyle,
  foregroundStyle,
  frame,
  glassEffect,
  imageScale,
  labelStyle
} from '@expo/ui/swift-ui/modifiers'
import { ICON_BUTTON_SIZES, type IconButtonIcon, type IconButtonProps } from './IconButton.types'

const symbols = {
  settings: 'gear',
  back: 'chevron.left',
  close: 'xmark'
} as const satisfies Record<IconButtonIcon, string>

export function IconButton({ icon, label, onPress, size = 'large' }: IconButtonProps) {
  const { theme } = useTheme()
  const dimension = ICON_BUTTON_SIZES[size]

  return (
    <Host style={{ width: dimension, height: dimension }}>
      <Button
        label={label}
        systemImage={symbols[icon]}
        modifiers={[
          labelStyle('iconOnly'),
          buttonStyle('plain'),
          imageScale(size),
          frame({ width: dimension, height: dimension }),
          glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'circle' }),
          foregroundStyle(theme.colors.colorTextPrimary)
        ]}
        onPress={onPress}
      />
    </Host>
  )
}
