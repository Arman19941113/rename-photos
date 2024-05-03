import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'

function DropArea({ className, isDragging }: { className?: string; isDragging: boolean }) {
  const { t } = useTranslation()

  return (
    <div
      aria-hidden
      className={clsx(
        className,
        'flex-center rounded-3xl border-2 border-dashed',
        isDragging ? 'border-primary-400' : 'border-default-400',
      )}
    >
      <p className="text-lg text-default-500">{t('Drop Files')}</p>
    </div>
  )
}

export default DropArea
