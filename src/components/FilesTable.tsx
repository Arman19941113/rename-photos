import { RiAlertLine, RiCheckLine, RiCloseLine, RiQuestionnaireLine } from '@/components/icon'
import { MetadataStatus } from '@/const'
import type { UIFile } from '@/types/file'
import { ScrollShadow } from '@nextui-org/scroll-shadow'
import { Selection, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@nextui-org/table'
import { Tooltip } from '@nextui-org/tooltip'
import { useTranslation } from 'react-i18next'

function FilesTable({
  files,
  selectedKey,
  onSelectedKeyChange,
}: {
  files: UIFile[]
  selectedKey: string | null
  onSelectedKeyChange: (key: string | null) => void
}) {
  const { t } = useTranslation()

  const selectedKeys: Set<string> = selectedKey ? new Set([selectedKey]) : new Set()
  const handleSelectionChange = (selection: Selection) => {
    if (typeof selection === 'string') return
    if (selection.size) {
      const [key] = selection
      onSelectedKeyChange(key as string)
    } else {
      onSelectedKeyChange(null)
    }
  }

  return (
    <ScrollShadow className="h-full" visibility="bottom" hideScrollBar>
      <Table
        isCompact
        isHeaderSticky
        removeWrapper
        aria-label="table"
        color="primary"
        selectionMode="single"
        selectionBehavior="replace"
        classNames={{ tr: '!outline-none', td: '!outline-none' }}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
      >
        <TableHeader>
          <TableColumn>{t('table.filename')}</TableColumn>
          <TableColumn>{t('table.newFilename')}</TableColumn>
          <TableColumn width={48}>{t('table.metadata')}</TableColumn>
        </TableHeader>
        <TableBody>
          {files.map(fileInfo => (
            <TableRow key={fileInfo.pathname}>
              {/* current filename */}
              <TableCell>
                <span className="font-mono text-s xl:text-sm">{fileInfo.filename}</span>
              </TableCell>
              {/* expected new filename */}
              <TableCell>
                <span className="font-mono text-s xl:text-sm">{fileInfo.shouldSkip ? '' : fileInfo.newFilename}</span>
              </TableCell>
              {/* metadata status and tips */}
              <TableCell>
                <MetadataTips fileInfo={fileInfo} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="h-6" />
    </ScrollShadow>
  )
}

function MetadataTips({ fileInfo }: { fileInfo: UIFile }) {
  if (fileInfo.fileType === 'other')
    return (
      <div className="px-1">
        <RiQuestionnaireLine className="text-base text-default-400 xl:text-large" />
      </div>
    )

  switch (fileInfo.metadataStatus) {
    case MetadataStatus.SUCCESS:
      return (
        <div className="px-1">
          <RiCheckLine className="text-base text-success xl:text-large" />
        </div>
      )
    case MetadataStatus.WARNING:
      return (
        <Tooltip color="warning" size="sm" showArrow radius="none" closeDelay={100} content={fileInfo.metadataTips}>
          <div className="px-1">
            <RiAlertLine className="text-base text-warning xl:text-large" />
          </div>
        </Tooltip>
      )
    case MetadataStatus.ERROR:
      return (
        <Tooltip color="danger" size="sm" showArrow radius="none" closeDelay={100} content={fileInfo.metadataTips}>
          <div className="px-1">
            <RiCloseLine className="text-base text-danger xl:text-large" />
          </div>
        </Tooltip>
      )
  }
}

export default FilesTable
