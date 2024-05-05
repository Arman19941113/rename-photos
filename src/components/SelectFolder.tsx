import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import { Button } from '@nextui-org/button'
import { RiFolderOpenLine } from '@/components/icon'
import folderImage from '@/assets/folder-image.jpg'

export default function SelectFolder({
  className,
  dirPath,
  onClick,
}: {
  className?: string
  dirPath: string
  onClick: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className={clsx('flex items-center', className)}>
      <Button
        radius="sm"
        size="sm"
        className="select-none bg-gradient-to-tr from-pink-500 to-yellow-500 text-white !outline-0"
        onClick={onClick}
        startContent={<RiFolderOpenLine className="text-base" />}
      >
        {t('Select Folder')}
      </Button>

      {dirPath && (
        <div className="ml-6 flex items-center">
          <img src={folderImage} alt="" width={20} />
          <span className="ml-2">{dirPath}</span>
        </div>
      )}
    </div>
  )
}
