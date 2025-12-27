import { MetadataStatus } from '@/const'

type ImageMetaFields = 'date' | 'make' | 'camera' | 'lens' | 'focalLength' | 'aperture' | 'shutter' | 'iso'
export type ImageMetadata = Record<ImageMetaFields, string | null>

type VideoMetaFields = 'date' | 'make' | 'camera'
export type VideoMetadata = Record<VideoMetaFields, string | null>

export type IPCFile = {
  pathname: string
  filename: string
  size: number
  created: number
} & (
  | {
      fileType: 'image'
      metadata: ImageMetadata | null
      metaError: string | null
    }
  | {
      fileType: 'video'
      metadata: VideoMetadata | null
      metaError: string | null
    }
  | {
      fileType: 'other'
    }
)
export type FileType = IPCFile['fileType']

export type UIFile = {
  pathname: string
  dirname: string // the directory name of the file
  filename: string
  newFilename: string // expected new filename to be renamed
  shouldSkip: boolean // skip this file while renaming
  size: number
  fileSize: string // the size of the file, like '10 MB'
  created: string // the creation date of the file, like '2024-05-09 11:17:13'
} & (
  | {
      fileType: 'image'
      metadata: ImageMetadata | null
      metadataStatus: MetadataStatus // the status of the metadata data
      metadataTips: string // the tips of the metadata data
    }
  | {
      fileType: 'video'
      metadata: VideoMetadata | null
      metadataStatus: MetadataStatus // the status of the metadata data
      metadataTips: string // the tips of the metadata data
    }
  | {
      fileType: 'other'
      metadata: null
    }
)
