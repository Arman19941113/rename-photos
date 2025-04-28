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

export function transformIpcFiles({
  ipcFiles,
  exifMode,
  format,
  t,
}: {
  ipcFiles: IpcFiles
  exifMode: boolean
  format: string
  t: any
}): FileInfo[] {
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
        exifMsg = t('Missing EXIF data')
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

  // This block generates unique new filenames.
  const nameMap: Record<string, string> = {}
  const newNameCounter: Record<string, number> = {}
  // counts new filename
  files.forEach(item => {
    // get lowercase filename to avoid name conflicts
    let newFilename = ''
    if (exifMode && item.exifStatus !== ExifStatus.SUCCESS) {
      // in exifMode, if on exif data, keep old filename
      newFilename = transformExtNameToLowerCase(item.filename)
    } else {
      // with lower case extname
      newFilename = generateFilename({
        filename: item.filename,
        format,
        created: item.created,
        exifData: item.exifData,
      })
    }

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
    if (exifMode && item.exifStatus !== ExifStatus.SUCCESS) {
      // keep old filename, no need to rename
      item.newFilename = item.filename
      return
    }

    const newFilename = nameMap[item.filename]
    const extName = getExtName(item.filename)
    const duplicates = newNameCounter[newFilename]
    if (duplicates) {
      const maxLength = duplicates.toString().length
      const sequence = nameSequence.hasOwnProperty(newFilename)
        ? ++nameSequence[newFilename]
        : (nameSequence[newFilename] = 1)
      item.newFilename = removeExtName(newFilename) + '_' + sequence.toString().padStart(maxLength, '0') + extName
    } else {
      item.newFilename = removeExtName(newFilename) + extName
    }
  })

  return files
}

function getBaseName(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.slice(0, -1).join('.') : filename
}

function getExtName(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
}

function removeExtName(filename: string): string {
  const parts = filename.split('.')
  return parts.slice(0, parts.length - 1).join('.')
}

function transformExtNameToLowerCase(filename: string): string {
  const parts = filename.split('.')
  if (parts.length > 1) {
    parts[parts.length - 1] = parts[parts.length - 1].toLowerCase()
    return parts.join('.')
  }
  return filename
}

function generateFilename({
  filename,
  format,
  created,
  exifData,
}: {
  filename: string
  format: string
  created: string
  exifData: IpcFiles[number]['exifData']
}) {
  try {
    // eg: 2024-03-04 08:33:38
    const dateTime = exifData?.date || created || ''
    const timeList = dateTime.replace(/\s|:/g, '-').split('-')
    const formatValueMap: Record<FormatVar, string> = {
      '{YYYY}': timeList[0] || 'YYYY',
      '{MM}': timeList[1] || 'MM',
      '{DD}': timeList[2] || 'DD',
      '{hh}': timeList[3] || 'hh',
      '{mm}': timeList[4] || 'mm',
      '{ss}': timeList[5] || 'ss',
      '{Date}': exifData?.date?.replace(/:/g, '.') || 'Date',
      '{Make}': exifData?.make || 'Make',
      '{Camera}': exifData?.camera || 'Camera',
      '{Lens}': exifData?.lens || 'Lens',
      '{FocalLength}': exifData?.focal_length || 'FocalLength',
      '{Aperture}': exifData?.aperture || 'Aperture',
      '{Shutter}': exifData?.shutter || 'Shutter',
      '{ISO}': exifData?.iso || 'ISO',
      '{Current}': getBaseName(filename) || 'Current',
      '{current}': getBaseName(filename) || 'Current',
    }
    let newFilename = format
    Object.entries(formatValueMap).forEach(([key, value]) => {
      newFilename = newFilename.replace(new RegExp(key, 'g'), getValidPath(value))
    })
    return newFilename + getExtName(filename).toLocaleLowerCase()
  } catch (e) {
    return format
  }
}

function checkPreview(filename: string, size: number) {
  const maxSize = 50_000_000
  if (size > maxSize) return false

  const mimeType = mime.getType(filename)
  if (!mimeType) return false

  return mimeType.startsWith('image') || mimeType.startsWith('video')
}
