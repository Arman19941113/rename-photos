type IpcFiles = Array<{
  pathname: string
  filename: string
  modified: number
  size: number
  exifData: Record<EXIF_FIELD, string | null> | null
  exifError: string | null
}>
