import { useTranslation } from '@ruqa/locales'
import { Button, Input } from '@ruqa/components'
import { CheckIcon, CopyIcon } from '@ruqa/components/icons'

interface TopicCopyButtonProps {
  topic: string
  copied: boolean
  onCopy: () => void
  placeholder: string
}

export function TopicCopyButton({ topic, copied, onCopy, placeholder }: TopicCopyButtonProps) {
  const { t } = useTranslation(['send', 'common'])

  return (
    <Input
      aria-label={t('send:connection.copyLabel')}
      readOnly
      value={topic}
      placeholder={placeholder}
      trailing={
        <Button
          variant={copied ? 'success' : 'ghost'}
          size='sm'
          iconOnly
          aria-label={t('send:connection.copyLabel')}
          disabled={!topic}
          onClick={onCopy}
          icon={copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        />
      }
    />
  )
}
