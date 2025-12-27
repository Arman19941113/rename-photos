import { MetadataStatus, formatVars, FormatVar } from '@/const'
import type { IPCFile, UIFile } from '@/types/file'
import type { ImageMetadata } from '@/types/file'
import { formatDate, formatFileSize, getDirFromFilePath, getValidPath } from './'

type AnyMetadata = UIFile['metadata']
type OptionalMetadata = Partial<ImageMetadata>

export function transformIPCFiles({
  ipcFiles,
  strictMode,
  useCreatedDate,
  format,
  t,
}: {
  ipcFiles: IPCFile[]
  strictMode: boolean
  useCreatedDate: boolean
  format: string
  t: any
}): UIFile[] {
  const usedVars = formatVars.filter(v => format.includes(v))

  // === transform basic info
  const files = ipcFiles
    .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }))
    .map(item => {
      const commonFields = {
        created: formatDate(item.created),
        pathname: item.pathname,
        dirname: getDirFromFilePath(item.pathname),
        filename: item.filename,
        newFilename: '',
        shouldSkip: false,
        size: item.size,
        fileSize: formatFileSize(item.size),
      }
      switch (item.fileType) {
        case 'image': {
          const metadata = item.metadata
          const { metadataStatus, metadataTips } = getMetadataStatusAndTips({ metadata, metaError: item.metaError, t })

          const uiFile: UIFile = {
            ...commonFields,
            fileType: 'image',
            metadata,
            metadataStatus,
            metadataTips,
          }
          return uiFile
        }
        case 'video': {
          const metadata = item.metadata
          const { metadataStatus, metadataTips } = getMetadataStatusAndTips({ metadata, metaError: item.metaError, t })

          const uiFile: UIFile = {
            ...commonFields,
            fileType: 'video',
            metadata,
            metadataStatus,
            metadataTips,
          }
          return uiFile
        }
        case 'other': {
          const uiFile: UIFile = {
            ...commonFields,
            fileType: 'other',
            metadata: null,
          }
          return uiFile
        }
      }
    })

  // === transform newFilename and shouldSkip
  // nameMap: filename -> newFilename
  const nameMap: Record<string, string> = {}
  // the counts of lowerNewFilename
  const newNameCounter: Record<string, number> = {}
  // compute newFilename
  files.forEach(item => {
    let newFilename = ''
    if (strictMode && !isTemplateSatisfiable({ file: item, usedVars, useCreatedDate })) {
      // When strict mode is enabled and metadata is missing, it should be skipped
      item.shouldSkip = true
      item.newFilename = item.filename
      newFilename = item.filename
    } else {
      newFilename = generateFilename({
        filename: item.filename,
        format,
        metadata: item.metadata || {},
        created: item.created,
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
    if (item.shouldSkip) return

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

    // When the new filename is the same as the original filename, it should be skipped
    item.shouldSkip = item.newFilename === item.filename
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
  metadata,
  created,
  useCreatedDate,
}: {
  filename: string
  format: string
  metadata: OptionalMetadata
  created: string
  useCreatedDate: boolean
}) {
  try {
    // dateTime example: 2024-03-04 08:33:38
    const dateTime = (useCreatedDate ? created : metadata?.date) ?? ''
    const timeList = dateTime.replace(/\s|:/g, '-').split('-')
    const formatValueMap: Record<FormatVar, string> = {
      '{YYYY}': timeList[0] || 'YYYY',
      '{MM}': timeList[1] || 'MM',
      '{DD}': timeList[2] || 'DD',
      '{hh}': timeList[3] || 'hh',
      '{mm}': timeList[4] || 'mm',
      '{ss}': timeList[5] || 'ss',
      '{Date}': dateTime.replace(/:/g, '.') || 'Date',
      '{Make}': metadata?.make || 'Make',
      '{Camera}': metadata?.camera || 'Camera',
      '{Lens}': metadata?.lens || 'Lens',
      '{FocalLength}': metadata?.focalLength || 'FocalLength',
      '{Aperture}': metadata?.aperture || 'Aperture',
      '{Shutter}': metadata?.shutter || 'Shutter',
      '{ISO}': metadata?.iso || 'ISO',
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

function isTemplateSatisfiable({
  file,
  usedVars,
  useCreatedDate,
}: {
  file: UIFile
  usedVars: FormatVar[]
  useCreatedDate: boolean
}) {
  const metadata: OptionalMetadata = file.metadata || {}
  for (const v of usedVars) {
    switch (v) {
      // date vars
      case '{YYYY}':
      case '{MM}':
      case '{DD}':
      case '{hh}':
      case '{mm}':
      case '{ss}':
      case '{Date}':
        if (!useCreatedDate && !metadata?.date) return false
        break

      // common metadata vars
      case '{Make}':
        if (!metadata?.make) return false
        break
      case '{Camera}':
        if (!metadata?.camera) return false
        break

      // image-only vars
      case '{Lens}':
        if (!metadata?.lens) return false
        break
      case '{FocalLength}':
        if (!metadata?.focalLength) return false
        break
      case '{Aperture}':
        if (!metadata?.aperture) return false
        break
      case '{Shutter}':
        if (!metadata?.shutter) return false
        break
      case '{ISO}':
        if (!metadata?.iso) return false
        break

      // always available
      case '{Current}':
      case '{current}':
        break

      default:
        // there’s nothing left in a union
        const _exhaustiveCheck: never = v
        throw new Error(`Unhandled format variable: ${_exhaustiveCheck}`)
    }
  }

  return true
}

function getMetadataStatusAndTips({
  metadata,
  metaError,
  t,
}: {
  metadata: AnyMetadata
  metaError: string | null
  t: any
}): { metadataStatus: MetadataStatus; metadataTips: string } {
  if (metaError) {
    return {
      metadataStatus: MetadataStatus.ERROR,
      metadataTips: metaError === 'Unknown image format' ? t('errors.unknownImageFormat') : metaError,
    }
  }
  if (!metadata || Object.values(metadata).some(val => val === null)) {
    return {
      metadataStatus: MetadataStatus.WARNING,
      metadataTips: t('errors.missingMetadata'),
    }
  }
  return {
    metadataStatus: MetadataStatus.SUCCESS,
    metadataTips: '',
  }
}
