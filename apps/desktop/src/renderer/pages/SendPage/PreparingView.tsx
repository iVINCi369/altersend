import { Button, WaitingState } from '@ruqa/components'
import { SendIcon } from '@ruqa/components/icons'
import { clearSenderFlow } from '@ruqa/domain'
import { useTranslation } from '@ruqa/locales'

export function PreparingView() {
  const { t } = useTranslation(['send', 'common'])

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex flex-1 flex-col items-center justify-center'>
        <WaitingState
          icon={<SendIcon size={30} />}
          title={t('send:page.preparing.title')}
          description={t('send:page.preparing.description')}
        />
      </div>

      <div className='flex justify-end pt-7'>
        <Button variant='secondary' size='sm' onClick={clearSenderFlow}>
          {t('common:actions.cancel')}
        </Button>
      </div>
    </div>
  )
}
