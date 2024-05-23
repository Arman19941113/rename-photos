import { ExifStatus, FormatVar } from '@/const'
import mime from 'mime/lite'
import { formatDate, formatFileSize, getDirFromFilePath, getValidPath } from './'

export interface FileInfo {
  created: string
  pathname: string
  dirname: string
  filename: string
  newFilename: string
  size: string
  preview: boolean
  exifStatus: ExifStatus
  exifMsg: string
  exifData: IpcFiles[number]['exifData']
}

export function transformIpcFiles({ ipcFiles, format, t }: { ipcFiles: IpcFiles; format: string; t: any }): FileInfo[] {
  const files = ipcFiles
    .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }))
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
        created: formatDate(item.created),
        pathname: item.pathname,
        dirname: getDirFromFilePath(item.pathname),
        filename: item.filename,
        newFilename: '',
        size: formatFileSize(item.size),
        preview: checkPreview(item.filename, item.size),
        exifStatus,
        exifMsg,
        exifData,
      }
    })

  const nameMap: Record<string, string> = {}
  const newNameCounter: Record<string, number> = {}
  // counts new filename
  files.forEach(item => {
    const newFilename = generateFilename({
      format,
      created: item.created,
      exifData: item.exifData,
    })
    nameMap[item.filename] = newFilename
    if (newNameCounter.hasOwnProperty(newFilename)) {
      newNameCounter[newFilename] += 1
    } else {
      newNameCounter[newFilename] = 0
    }
  })
  // handle duplicates
  const nameSequence: Record<string, number> = {}
  files.forEach(item => {
    const newFilename = nameMap[item.filename]
    const extName = getExtName(item.filename)
    const duplicates = newNameCounter[newFilename]
    if (duplicates) {
      const maxLength = duplicates.toString().length
      const sequence = nameSequence.hasOwnProperty(newFilename)
        ? ++nameSequence[newFilename]
        : (nameSequence[newFilename] = 1)
      item.newFilename = newFilename + '_' + sequence.toString().padStart(maxLength, '0') + extName
    } else {
      item.newFilename = newFilename + extName
    }
  })

  return files
}

export function getExtName(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
}

function generateFilename({
  format,
  created,
  exifData,
}: {
  format: string
  created: string
  exifData: IpcFiles[number]['exifData']
}) {
  try {
    // eg: 2024-03-04 08:33:38
    const dateTime = exifData?.Date || created || ''
    const timeList = dateTime.replace(/\s|:/g, '-').split('-')
    const formatValueMap: Record<FormatVar, string> = {
      '{YYYY}': timeList[0] || 'YYYY',
      '{MM}': timeList[1] || 'MM',
      '{DD}': timeList[2] || 'DD',
      '{hh}': timeList[3] || 'hh',
      '{mm}': timeList[4] || 'mm',
      '{ss}': timeList[5] || 'ss',
      '{Date}': exifData?.Date?.replace(/:/g, '.') || 'Date',
      '{Make}': exifData?.Make || 'Make',
      '{Camera}': exifData?.Camera || 'Camera',
      '{Lens}': exifData?.Lens || 'Lens',
      '{FocalLength}': exifData?.FocalLength || 'FocalLength',
      '{Aperture}': exifData?.Aperture || 'Aperture',
      '{Shutter}': exifData?.Shutter || 'Shutter',
      '{ISO}': exifData?.ISO || 'ISO',
    }
    let newFilename = format
    Object.entries(formatValueMap).forEach(([key, value]) => {
      newFilename = newFilename.replace(new RegExp(key, 'g'), getValidPath(value))
    })
    return newFilename
  } catch (e) {
    return format
  }
}

export function checkPreview(filename: string, size: number) {
  const maxSize = 50_000_000
  if (size > maxSize) return false

  const mimeType = mime.getType(filename)
  if (!mimeType) return false

  return mimeType.startsWith('image') || mimeType.startsWith('video')
}
