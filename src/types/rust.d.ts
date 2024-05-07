export type ExifField = 'Date' | 'Make' | 'Camera' | 'Lens' | 'FocalLength' | 'Aperture' | 'Shutter' | 'ISO'

export type IpcFiles = Array<{
  pathname: string
  filename: string
  modified: number
  size: number
  exifData: Record<ExifField, string | null> | null
  exifError: string | null
}>