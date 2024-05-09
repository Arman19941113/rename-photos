import { clsx } from 'clsx'
import { KeyboardEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@nextui-org/button'
import { Input } from '@nextui-org/input'
import { RiFolderOpenLine } from '@/components/icon'

export default function OperationBar({
  hasFiles,
  format,
  onClickOpen,
  onClickRename,
  onFormatChange,
}: {
  hasFiles: boolean
  format: string
  onClickOpen: () => void
  onClickRename: () => void
  onFormatChange: (format: string) => void
}) {
  const { t } = useTranslation()

  const handleBlur = () => onFormatChange(value)
  const handleKeydown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onFormatChange(value)
  }
  const [value, setValue] = useState(format)
  const handleValueChange = (val: string) => setValue(val.trim())

  return (
    <div className="mb-5 flex h-8 shrink-0 items-center justify-between">
      <Button
        radius="sm"
        size="sm"
        className="btn--grad-blue shrink-0"
        onClick={onClickOpen}
        startContent={<RiFolderOpenLine className="text-base" />}
      >
        {t('Open Folder')}
      </Button>

      <div className={clsx(hasFiles ? 'flex' : 'hidden', 'w-full items-center justify-end pl-20')}>
        <Input
          value={value}
          className="max-w-80"
          variant="underlined"
          color="primary"
          size="sm"
          onBlur={handleBlur}
          onKeyDown={handleKeydown}
          onValueChange={handleValueChange}
        />
        <Button radius="sm" size="sm" className="btn--grad-pink ml-4 shrink-0" onClick={onClickRename}>
          {t('Rename')}
          <span>🚀</span>
        </Button>
      </div>
    </div>
  )
}
