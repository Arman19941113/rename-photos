import { RiFolderOpenLine } from '@/components/icon'
import { Button } from '@nextui-org/button'
import { Input } from '@nextui-org/input'
import { clsx } from 'clsx'
import { KeyboardEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function OperationBar({
  format,
  onFormatChange,
  hasFiles,
  onClickOpen,
  onClickRename,
}: {
  format: string
  onFormatChange: (format: string) => void
  hasFiles: boolean
  onClickOpen: () => void
  onClickRename: () => void
}) {
  const { t } = useTranslation()

  const inputRef = useRef<HTMLInputElement>(null)
  const compositionRef = useRef(false)
  const [value, setValue] = useState(format)

  const handleCompositionStart = () => {
    compositionRef.current = true
  }
  const handleCompositionEnd = () => {
    compositionRef.current = false
    onFormatChange(value.trim())
  }
  const handleValueChange = (val: string) => {
    setValue(val)
    if (!compositionRef.current) {
      onFormatChange(val.trim())
    }
  }
  const handleKeydown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      inputRef.current?.blur()
    }
  }
  const handleBlur = () => {
    const val = value.trim()
    setValue(val)
    onFormatChange(val)
  }

  return (
    <div className="mb-4 flex h-8 shrink-0 items-center justify-between">
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
          ref={inputRef}
          value={value}
          className="max-w-80"
          variant="underlined"
          color="primary"
          size="sm"
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onValueChange={handleValueChange}
          onKeyDown={handleKeydown}
          onBlur={handleBlur}
        />
        <Button radius="sm" size="sm" className="btn--grad-pink ml-4 shrink-0" onClick={onClickRename}>
          {t('Rename')}
          <span>🚀</span>
        </Button>
      </div>
    </div>
  )
}

export default OperationBar
