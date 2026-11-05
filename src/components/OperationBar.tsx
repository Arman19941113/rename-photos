import { RiChatHistoryLine, RiFolderOpenLine } from '@/components/icon'
import { Button } from '@heroui/button'
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/dropdown'
import type { Selection } from '@heroui/table'
import { Input } from '@heroui/input'
import { clsx } from 'clsx'
import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const RENAMING_LOADING_DELAY_MS = 200

function OperationBar({
  inputValue,
  onInputValueChange,
  format,
  formatOptions,
  onFormatChange,
  hasFiles,
  isRenaming,
  onClickOpen,
  onClickRename,
}: {
  inputValue: string
  onInputValueChange: (value: string) => void
  format: string
  onFormatChange: (format: string) => void
  formatOptions: string[]
  hasFiles: boolean
  isRenaming: boolean
  onClickOpen: () => void
  onClickRename: () => void
}) {
  const { t } = useTranslation()

  const inputRef = useRef<HTMLInputElement>(null)
  const compositionRef = useRef(false)
  const [showRenamingLoading, setShowRenamingLoading] = useState(false)
  const items = formatOptions.map(option => ({ key: option, value: option }))

  useEffect(() => {
    if (!isRenaming) return

    const timer = window.setTimeout(() => {
      setShowRenamingLoading(true)
    }, RENAMING_LOADING_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      setShowRenamingLoading(false)
    }
  }, [isRenaming])

  const handleCompositionStart = () => {
    compositionRef.current = true
  }
  const handleCompositionEnd = () => {
    compositionRef.current = false
    onFormatChange(inputValue.trim())
  }
  const handleValueChange = (val: string) => {
    onInputValueChange(val)
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
    const val = inputValue.trim()
    onInputValueChange(val)
    onFormatChange(val)
  }

  const handleSelect = (selection: Selection) => {
    if (selection === 'all') return
    const [value] = selection
    if (value === undefined) return
    const format = String(value)
    onInputValueChange(format)
    onFormatChange(format)
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
        {t('buttons.openFolder')}
      </Button>

      <div className={clsx(hasFiles ? 'flex' : 'hidden', 'w-full items-center justify-end pl-20')}>
        <Input
          aria-label={t('buttons.renameFormat')}
          ref={inputRef}
          value={inputValue}
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
        <Dropdown placement="bottom-end" offset={14}>
          <DropdownTrigger>
            <button type="button" aria-label={t('buttons.formatHistory')}>
              <RiChatHistoryLine className="cursor-pointer text-large text-default-500" />
            </button>
          </DropdownTrigger>
          <DropdownMenu
            color="secondary"
            variant="light"
            disallowEmptySelection
            selectionMode="single"
            selectedKeys={[format]}
            onSelectionChange={handleSelect}
            items={items}
          >
            {item => <DropdownItem key={item.key}>{item.value}</DropdownItem>}
          </DropdownMenu>
        </Dropdown>
        <Button
          radius="sm"
          size="sm"
          className="btn--grad-pink ml-4 shrink-0"
          isDisabled={isRenaming}
          isLoading={isRenaming && showRenamingLoading}
          onClick={onClickRename}
        >
          {t('buttons.rename')}
          <span>🚀</span>
        </Button>
      </div>
    </div>
  )
}

export default OperationBar
