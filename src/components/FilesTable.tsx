import { RiAlertLine, RiCheckLine, RiCloseLine } from '@/components/icon'
import { ExifStatus } from '@/const'
import { FileInfo } from '@/util'
import { ScrollShadow } from '@nextui-org/scroll-shadow'
import { Selection, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@nextui-org/table'
import { Tooltip } from '@nextui-org/tooltip'
import { useTranslation } from 'react-i18next'

function FilesTable({
  files,
  onSelectedKeyChange,
}: {
  files: FileInfo[]
  onSelectedKeyChange: (key: string | null) => void
}) {
  const { t } = useTranslation()

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
        onSelectionChange={handleSelectionChange}
      >
        <TableHeader>
          <TableColumn>{t('Filename')}</TableColumn>
          <TableColumn>{t('New Filename')}</TableColumn>
          <TableColumn width={48}>{t('Exif')}</TableColumn>
        </TableHeader>
        <TableBody>
          {files.map(fileInfo => (
            <TableRow key={fileInfo.pathname}>
              <TableCell>
                <span className="font-mono text-s xl:text-sm">{fileInfo.filename}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-s xl:text-sm">{fileInfo.newFilename}</span>
              </TableCell>
              <TableCell>
                <ExifTips fileInfo={fileInfo} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="h-6" />
    </ScrollShadow>
  )
}

function ExifTips({ fileInfo }: { fileInfo: FileInfo }) {
  switch (fileInfo.exifStatus) {
    case ExifStatus.SUCCESS:
      return (
        <div className="px-1">
          <RiCheckLine className="text-base text-success xl:text-large" />
        </div>
      )
    case ExifStatus.WARNING:
      return (
        <Tooltip color="warning" size="sm" showArrow radius="none" closeDelay={100} content={fileInfo.exifMsg}>
          <div className="px-1">
            <RiAlertLine className="text-base text-warning xl:text-large" />
          </div>
        </Tooltip>
      )
    case ExifStatus.ERROR:
      return (
        <Tooltip color="danger" size="sm" showArrow radius="none" closeDelay={100} content={fileInfo.exifMsg}>
          <div className="px-1">
            <RiCloseLine className="text-base text-danger xl:text-large" />
          </div>
        </Tooltip>
      )
  }
}

export default FilesTable
