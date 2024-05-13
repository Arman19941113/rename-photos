import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'

function DropGuide({ isDragging }: { isDragging: boolean }) {
  const { t } = useTranslation()

  return (
    <div
      aria-hidden
      className={clsx(
        'flex-center mb-5 h-full w-full cursor-default select-none rounded-3xl border-2 border-dashed',
        isDragging ? 'border-pink-400' : 'border-default-400',
      )}
    >
      <p className="text-lg text-default-500 xl:text-xl">{t('Drop Files')}</p>
    </div>
  )
}

export default DropGuide
