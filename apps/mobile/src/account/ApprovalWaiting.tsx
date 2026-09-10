import { StyleSheet, View } from 'react-native'
import { WaitingState } from '@ruqa/components'
import { ArrowUpCircleIcon } from '@ruqa/components/icons'
import { useTranslation } from '@ruqa/locales'
import { Layout } from '@/src/components'
import { DismissRow } from './DismissRow'
import type { AccountPhaseProps } from './types'

export function ApprovalWaiting({ onDismiss }: AccountPhaseProps) {
  const { t } = useTranslation(['settings'])

  return (
    <Layout compactTop>
      <DismissRow onDismiss={onDismiss} />
      <View style={styles.centre}>
        <WaitingState
          icon={<ArrowUpCircleIcon size={30} />}
          title={t('settings:account.approvalTitle')}
          description={t('settings:account.approvalBody')}
        />
      </View>
    </Layout>
  )
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' }
})
