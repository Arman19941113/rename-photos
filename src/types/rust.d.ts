declare type ExifField = 'date' | 'make' | 'camera' | 'lens' | 'focalLength' | 'aperture' | 'shutter' | 'iso'

declare type IpcFiles = Array<{
  pathname: string
  filename: string
  size: number
  created: number
  exifData: Record<ExifField, string | null> | null
  exifError: string | null
}>
