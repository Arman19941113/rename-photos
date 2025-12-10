import { ExifStatus, FormatVar } from '@/const'
import mime from 'mime/lite'
import { formatDate, formatFileSize, getDirFromFilePath, getValidPath } from './'

export interface FileInfo {
  created: string
  pathname: string
  dirname: string
  filename: string
  newFilename: string
  shouldIgnore: boolean
  size: string
  preview: boolean
  exifStatus: ExifStatus
  exifMsg: string
  exifData: IpcFiles[number]['exifData']
}

export function transformIpcFiles({
  ipcFiles,
  exifMode,
  useCreatedDate,
  format,
  t,
}: {
  ipcFiles: IpcFiles
  exifMode: boolean
  useCreatedDate: boolean
  format: string
  t: any
}): FileInfo[] {
  // === transform basic info
  const files = ipcFiles
    .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }))
    .map(item => {
      let exifStatus = ExifStatus.SUCCESS
      let exifMsg = ''
      const { exifData, exifError } = item
      if (exifError) {
        exifStatus = ExifStatus.ERROR
        exifMsg = exifError === 'Unknown image format' ? t('errors.unknownImageFormat') : exifError
      } else if (Object.values(exifData!).some(val => val === null)) {
        exifStatus = ExifStatus.WARNING
        exifMsg = t('errors.missingExifData')
      }

      return {
        created: formatDate(item.created),
        pathname: item.pathname,
        dirname: getDirFromFilePath(item.pathname),
        filename: item.filename,
        newFilename: '',
        shouldIgnore: false,
        size: formatFileSize(item.size),
        preview: shouldPreview(item.filename, item.size),
        exifStatus,
        exifMsg,
        exifData,
      }
    })

  // === transform newFilename and shouldIgnore
  // nameMap: filename -> newFilename
  const nameMap: Record<string, string> = {}
  // the counts of lowerNewFilename
  const newNameCounter: Record<string, number> = {}
  // compute newFilename
  files.forEach(item => {
    let newFilename = ''
    if (exifMode && item.exifStatus !== ExifStatus.SUCCESS) {
      // no need to rename, keep old filename
      item.newFilename = item.filename
      item.shouldIgnore = true
      // to avoid name conflicts, record newFilename
      newFilename = item.filename
    } else {
      // generate new filename
      newFilename = generateFilename({
        filename: item.filename,
        format,
        created: item.created,
        exifData: item.exifData,
        useCreatedDate,
      })
      nameMap[item.filename] = newFilename
    }
    // record lowerNewFilename counts
    const lowerNewFilename = newFilename.toLowerCase()
    if (newNameCounter.hasOwnProperty(lowerNewFilename)) {
      newNameCounter[lowerNewFilename] += 1
    } else {
      newNameCounter[lowerNewFilename] = 0
    }
  })
  // handle duplicates
  const nameSeqRecord: Record<string, number> = {}
  files.forEach(item => {
    if (item.shouldIgnore) return

    const newFilename = nameMap[item.filename]
    const lowerNewFilename = newFilename.toLowerCase()
    const duplicateCount = newNameCounter[lowerNewFilename]
    if (duplicateCount) {
      const countLength = duplicateCount.toString().length
      const sequence = nameSeqRecord.hasOwnProperty(lowerNewFilename)
        ? ++nameSeqRecord[lowerNewFilename]
        : (nameSeqRecord[lowerNewFilename] = 1)
      const seqString = '_' + sequence.toString().padStart(countLength, '0')
      // new filename with sequence
      item.newFilename = removeExtName(newFilename) + seqString + getExtName(item.filename)
    } else {
      // expected new filename
      item.newFilename = newFilename
    }

    item.shouldIgnore = item.newFilename === item.filename
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

/**
 * Generate filename based on format and metadata
 */
function generateFilename({
  filename,
  format,
  created,
  exifData,
  useCreatedDate,
}: {
  filename: string
  format: string
  created: string
  exifData: IpcFiles[number]['exifData']
  useCreatedDate: boolean
}) {
  try {
    // dateTime example: 2024-03-04 08:33:38
    const dateTime = (useCreatedDate ? created : exifData?.date) ?? ''
    const timeList = dateTime.replace(/\s|:/g, '-').split('-')
    const formatValueMap: Record<FormatVar, string> = {
      '{YYYY}': timeList[0] || 'YYYY',
      '{MM}': timeList[1] || 'MM',
      '{DD}': timeList[2] || 'DD',
      '{hh}': timeList[3] || 'hh',
      '{mm}': timeList[4] || 'mm',
      '{ss}': timeList[5] || 'ss',
      '{Date}': dateTime.replace(/:/g, '.') || 'Date',
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
    let basename = format
    Object.entries(formatValueMap).forEach(([key, value]) => {
      basename = basename.replace(new RegExp(key, 'g'), getValidPath(value))
    })
    return basename + getExtName(filename)
  } catch (e) {
    return format
  }
}

/**
 * Whether the file is allowed to be previewed
 */
function shouldPreview(filename: string, size: number) {
  const maxSize = 50_000_000
  if (size > maxSize) return false

  const mimeType = mime.getType(filename)
  if (!mimeType) return false

  return mimeType.startsWith('image') || mimeType.startsWith('video')
}
