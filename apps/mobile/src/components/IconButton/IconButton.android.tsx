import { useTheme } from '@ruqa/components'
import { Host, Icon, IconButton as ComposeIconButton } from '@expo/ui/jetpack-compose'
import type { ImageSourcePropType } from 'react-native'
import arrowLeftIcon from '@/assets/icons/arrow-left.xml'
import closeIcon from '@/assets/icons/close.xml'
import settingsIcon from '@/assets/icons/settings.xml'
import { ICON_BUTTON_SIZES, type IconButtonIcon, type IconButtonProps } from './IconButton.types'

const sources: Record<IconButtonIcon, ImageSourcePropType> = {
  settings: settingsIcon,
  back: arrowLeftIcon,
  close: closeIcon
}

export function IconButton({ icon, onPress, size = 'large' }: IconButtonProps) {
  const { theme } = useTheme()
  const dimension = ICON_BUTTON_SIZES[size]

  return (
    <Host style={{ width: dimension, height: dimension }}>
      <ComposeIconButton onClick={onPress}>
        <Icon source={sources[icon]} tint={theme.colors.colorTextPrimary} />
      </ComposeIconButton>
    </Host>
  )
}
