declare type ExifField = 'Date' | 'Make' | 'Camera' | 'Lens' | 'FocalLength' | 'Aperture' | 'Shutter' | 'ISO'

declare type IpcFiles = Array<{
  pathname: string
  filename: string
  size: number
  created: number
  exifData: Record<ExifField, string | null> | null
  exifError: string | null
}>
