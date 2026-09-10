import { AppleIcon, DownloadIcon, WindowsIcon } from '@ruqa/components/icons'
import type { IconComponent } from '@ruqa/components/icons'
import { useTranslation } from '@ruqa/locales'
import { OS_DISPLAY, platform, type OS } from './platform'

const OS_ICON: Partial<Record<OS, IconComponent>> = {
  mac: AppleIcon,
  ios: AppleIcon,
  windows: WindowsIcon
}

export function useDownloadCta(): { label: string; Icon: IconComponent } {
  const { t } = useTranslation(['web'])
  const osName = OS_DISPLAY[platform.os]

  return {
    label: osName ? t('web:promo.getFor', { os: osName }) : t('web:promo.getApp'),
    Icon: OS_ICON[platform.os] ?? DownloadIcon
  }
}
