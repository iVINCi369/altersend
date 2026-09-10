import { StyleSheet, View } from 'react-native'
import { MenuItem, useTheme } from '@ruqa/components'
import { ClipboardIcon, CodeIcon, QrCodeIcon } from '@ruqa/components/icons'
import { useTranslation } from '@ruqa/locales'
import { BottomSheet } from '../BottomSheet'

interface AddPairDeviceSheetProps {
  open: boolean
  onClose: () => void
  onDismiss?: () => void
  onShowQrCode: () => void
  onScanQrCode: () => void
  onEnterCode: () => void
}

export function AddPairDeviceSheet({
  open,
  onClose,
  onDismiss,
  onShowQrCode,
  onScanQrCode,
  onEnterCode
}: AddPairDeviceSheetProps) {
  const { t } = useTranslation(['settings'])
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <BottomSheet open={open} onClose={onClose} onDismiss={onDismiss} sheetStyle={styles.sheet}>
      <View style={styles.actionList}>
        <MenuItem
          chevron={false}
          icon={<QrCodeIcon size={19} color={c.colorTextSecondary} />}
          label={t('settings:pairing.showQrCode')}
          onPress={onShowQrCode}
        />
        <MenuItem
          chevron={false}
          icon={<CodeIcon size={19} color={c.colorTextSecondary} />}
          label={t('settings:pairing.scanQrCode')}
          onPress={onScanQrCode}
        />
        <MenuItem
          isLast
          chevron={false}
          icon={<ClipboardIcon size={19} color={c.colorTextSecondary} />}
          label={t('settings:pairing.enterCode')}
          onPress={onEnterCode}
        />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 46, gap: 10 },
  actionList: { paddingTop: 8 }
})
