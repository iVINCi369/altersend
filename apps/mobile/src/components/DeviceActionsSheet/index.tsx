import { StyleSheet, View } from 'react-native'
import { MenuItem, useTheme } from '@ruqa/components'
import { PencilIcon, TrashIcon } from '@ruqa/components/icons'
import { useTranslation } from '@ruqa/locales'
import { BottomSheet } from '../BottomSheet'

interface DeviceActionsSheetProps {
  open: boolean
  onClose: () => void
  onRemove: () => void
  onRename: () => void
}

export function DeviceActionsSheet({ open, onClose, onRemove, onRename }: DeviceActionsSheetProps) {
  const { t } = useTranslation(['settings'])
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <BottomSheet open={open} onClose={onClose} sheetStyle={styles.sheet}>
      <View style={styles.actionList}>
        <MenuItem
          chevron={false}
          icon={<PencilIcon size={19} color={c.colorTextSecondary} />}
          label={t('settings:pairing.renameDevice')}
          onPress={onRename}
        />
        <MenuItem
          isLast
          chevron={false}
          tone='danger'
          icon={<TrashIcon size={19} color={c.colorDanger} />}
          label={t('settings:pairing.removeDevice')}
          onPress={onRemove}
        />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 32, gap: 12 },
  actionList: { overflow: 'hidden' }
})
