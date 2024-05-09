import { RiAlertLine, RiCheckLine, RiCloseLine } from '@/components/icon'
import { ExifStatus } from '@/const'
import { FileInfo } from '@/util'
import { ScrollShadow } from '@nextui-org/scroll-shadow'
import { Selection, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@nextui-org/table'
import { Tooltip } from '@nextui-org/tooltip'
import { useTranslation } from 'react-i18next'

function FilesTable({ files, onRowClick }: { files: FileInfo[]; onRowClick: (rowData: FileInfo | null) => void }) {
  const { t } = useTranslation()

  const handleSelectionChange = (selection: Selection) => {
    if (typeof selection === 'string') return
    if (selection.size) {
      const [key] = selection
      const file = files.find(item => item.pathname === key)
      file ? onRowClick(file) : onRowClick(null)
    } else {
      onRowClick(null)
    }
  }

  return (
    <ScrollShadow className="h-[calc(100%-52px)]" visibility="bottom" hideScrollBar>
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
                <span className="text-s">{fileInfo.filename}</span>
              </TableCell>
              <TableCell>
                <span className="text-s">{fileInfo.newFilename}</span>
              </TableCell>
              <TableCell>
                <ExifTips fileInfo={fileInfo} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="h-6"></div>
    </ScrollShadow>
  )
}

function ExifTips({ fileInfo }: { fileInfo: FileInfo }) {
  switch (fileInfo.exifStatus) {
    case ExifStatus.SUCCESS:
      return (
        <div className="px-1">
          <RiCheckLine className="text-base text-success" />
        </div>
      )
    case ExifStatus.WARNING:
      return (
        <Tooltip color="warning" size="sm" showArrow radius="none" closeDelay={100} content={fileInfo.exifMsg}>
          <div className="px-1">
            <RiAlertLine className="text-base text-warning" />
          </div>
        </Tooltip>
      )
    case ExifStatus.ERROR:
      return (
        <Tooltip color="danger" size="sm" showArrow radius="none" closeDelay={100} content={fileInfo.exifMsg}>
          <div className="px-1">
            <RiCloseLine className="text-base text-danger" />
          </div>
        </Tooltip>
      )
  }
}

export default FilesTable
