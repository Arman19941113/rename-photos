import { RiChatHistoryLine, RiFolderOpenLine } from '@/components/icon'
import { Button } from '@nextui-org/button'
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@nextui-org/dropdown'
import { Input } from '@nextui-org/input'
import { clsx } from 'clsx'
import { KeyboardEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'

function OperationBar({
  inputValue,
  onInputValueChange,
  format,
  formatOptions,
  onFormatChange,
  hasFiles,
  onClickOpen,
  onClickRename,
}: {
  inputValue: string
  onInputValueChange: (value: string) => void
  format: string
  onFormatChange: (format: string) => void
  formatOptions: string[]
  hasFiles: boolean
  onClickOpen: () => void
  onClickRename: () => void
}) {
  const { t } = useTranslation()

  const inputRef = useRef<HTMLInputElement>(null)
  const compositionRef = useRef(false)
  const items = formatOptions.map(option => ({ key: option, value: option }))

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

  const handleSelect = (selection: any) => {
    const [val] = [...selection]
    onInputValueChange(val)
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
            <div>
              <RiChatHistoryLine className="cursor-pointer text-large text-default-500" />
            </div>
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
        <Button radius="sm" size="sm" className="btn--grad-pink ml-4 shrink-0" onClick={onClickRename}>
          {t('Rename')}
          <span>🚀</span>
        </Button>
      </div>
    </div>
  )
}

export default OperationBar
