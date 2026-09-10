import { StyleSheet, View } from 'react-native'
import { useTheme } from '@ruqa/components'
import { useTranslation } from '@ruqa/locales'
import { IconButton } from '../IconButton'
import { Text } from '../ThemedText'

interface BottomSheetHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  onClose: () => void
}

export function BottomSheetHeader({ title, subtitle, onBack, onClose }: BottomSheetHeaderProps) {
  const { theme } = useTheme()
  const { t } = useTranslation(['common'])
  const c = theme.colors
  return (
    <View style={styles.header}>
      {onBack ? (
        <View style={styles.backSlot}>
          <IconButton icon='back' label={t('common:actions.back')} onPress={onBack} size='medium' />
        </View>
      ) : null}
      <View style={styles.titleGroup}>
        <Text style={[styles.title, { color: c.colorTextPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && <Text style={[styles.subtitle, { color: c.colorTextMuted }]}>{subtitle}</Text>}
      </View>
      <IconButton icon='close' label={t('common:actions.close')} onPress={onClose} size='medium' />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backSlot: { marginRight: 16 },
  titleGroup: { flex: 1, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 }
})
