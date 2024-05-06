import { EXIF_FIELD, FileInfo } from '@/hooks'
import { useTranslation } from 'react-i18next'

// todo preview image (https://github.com/tauri-apps/tauri/issues/9667)
// convertFileSrc: v2 do not support allowlist.protocol config
// plugin-fs.readFile into a blob has poor performance
function FileView({ className, fileInfo }: { className?: string; fileInfo: FileInfo }) {
  const { t } = useTranslation()

  let focalLength = fileInfo.exifData?.[EXIF_FIELD.FocalLength]
  focalLength = focalLength ? `${focalLength} mm` : ''
  let aperture = fileInfo.exifData?.[EXIF_FIELD.Aperture]
  aperture = aperture ? `f/${aperture}` : ''

  const data: Array<[string, string]> = [
    [t('Date'), fileInfo.exifData?.[EXIF_FIELD.Date] || '--'],
    [t('Make'), fileInfo.exifData?.[EXIF_FIELD.Make] || '--'],
    [t('Camera'), fileInfo.exifData?.[EXIF_FIELD.Camera] || '--'],
    [t('Lens'), fileInfo.exifData?.[EXIF_FIELD.Lens] || '--'],
    [t('FocalLength'), focalLength || '--'],
    [t('Aperture'), aperture || '--'],
    [t('Shutter'), fileInfo.exifData?.[EXIF_FIELD.Shutter] || '--'],
    [t('ISO'), fileInfo.exifData?.[EXIF_FIELD.ISO] || '--'],
  ]

  return (
    <div className={className}>
      <h2 className="text-base font-semibold">{fileInfo.filename}</h2>
      <p className="mt-1 text-default-500">{fileInfo.size}</p>

      <div className="mb-1 mt-6 border-b pb-1 text-xs	font-bold">{t('Exif Information')}</div>
      <ul className="text-xs">
        {data.map(item => (
          <li className="mb-1 flex justify-between border-b pb-1" key={item[0]}>
            <span className="mr-6 shrink-0 font-semibold text-default-500">{item[0]}</span>
            <span className="text-right font-medium">{item[1]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default FileView
