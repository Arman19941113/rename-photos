import { ExifStatus } from '@/const'
import { formatFileSize } from './'

export interface FileInfo {
  pathname: string
  filename: string
  size: string
  exifStatus: ExifStatus
  exifMsg: string
  exifData: IpcFiles[number]['exifData']
}

export function transformIpcFiles(ipcFiles: IpcFiles, t: any): FileInfo[] {
  return ipcFiles
    .map(item => {
      let exifStatus = ExifStatus.SUCCESS
      let exifMsg = ''
      const { exifData, exifError } = item
      if (exifError) {
        exifStatus = ExifStatus.ERROR
        exifMsg = exifError === 'Unknown image format' ? t('Unknown image format') : exifError
      } else if (Object.values(exifData!).some(val => val === null)) {
        exifStatus = ExifStatus.WARNING
        exifMsg = t('Missing exif data')
      }

      return {
        pathname: item.pathname,
        filename: item.filename,
        size: formatFileSize(item.size),
        exifStatus,
        exifMsg,
        exifData,
      }
    })
    .sort((a, b) => (a.filename.toLowerCase() > b.filename.toLowerCase() ? 1 : -1))
}
