import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinkRow, useTheme } from '@ruqa/components'
import { CheckIcon } from '@ruqa/components/icons'
import { formatFileSize, getOfferKey, useTransferStore } from '@ruqa/domain'
import { useTranslation } from '@ruqa/locales'
import { OpenAction, getFileMeta } from '../utils/fileRowUtils'
import { openCompletedFile } from '../utils/openCompletedFile'
import { Text } from '@/src/components/ThemedText'

export function ReceiveCompleteView() {
  const { t } = useTranslation(['receive', 'common'])
  const incomingFileOffers = useTransferStore((s) => s.incomingFileOffers)
  const downloadStates = useTransferStore((s) => s.receiveDownloadStates)
  const onOpenFile = openCompletedFile
  const { theme } = useTheme()

  const totalBytes = incomingFileOffers.reduce(
    (sum, f) => sum + (f.kind === 'file' ? f.size : 0),
    0
  )
  const fileCount = incomingFileOffers.length

  return (
    <View style={styles.container}>
      <View style={styles.successRow}>
        <CheckIcon size={17} color={theme.colors.colorSuccess} />
        <Text style={[styles.successTitle, { color: theme.colors.colorTextPrimary }]}>
          {t('receive:page.completed.title', { count: fileCount })}
        </Text>
        <Text
          style={[styles.successMeta, { color: theme.colors.colorTextMuted }]}
          numberOfLines={1}
        >
          {formatFileSize(totalBytes)} · {t('receive:summary.saved')}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.colorBorderPrimary,
            backgroundColor: theme.colors.colorBackgroundSubtle
          }
        ]}
      >
        {incomingFileOffers.map((file, index) => {
          if (file.kind !== 'file') return null
          const offerKey = getOfferKey(file)
          const state = downloadStates[offerKey]
          const isComplete = state?.status === 'completed'
          return (
            <LinkRow
              key={file.id}
              file
              bare
              isFirst={index === 0}
              label={file.name}
              description={getFileMeta(file.size, state, t)}
              trailing={
                isComplete ? (
                  <OpenAction fileName={file.name} offerKey={offerKey} onPress={onOpenFile} />
                ) : undefined
              }
            />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 14
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  successMeta: {
    flex: 1,
    fontSize: 13
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden'
  }
})
