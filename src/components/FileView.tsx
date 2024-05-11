import { MingcuteFileMoreLine } from '@/components/icon'
import { FileInfo } from '@/util'
import { convertFileSrc } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function FileView({ fileInfo }: { fileInfo: FileInfo }) {
  const { t } = useTranslation()

  /* image source */
  const imageSrc = convertFileSrc(fileInfo.pathname)
  const [isImgError, setIsImgError] = useState(false)
  const onImgError = () => setIsImgError(true)
  useEffect(() => setIsImgError(false), [fileInfo])

  /* exif data */
  let focalLength = fileInfo.exifData?.FocalLength
  focalLength = focalLength ? `${focalLength} mm` : ''
  let aperture = fileInfo.exifData?.Aperture
  aperture = aperture ? `f/${aperture}` : ''
  const exifData: Array<[string, string]> = [
    [t('Date'), fileInfo.exifData?.Date || '--'],
    [t('Make'), fileInfo.exifData?.Make || '--'],
    [t('Camera'), fileInfo.exifData?.Camera || '--'],
    [t('Lens'), fileInfo.exifData?.Lens || '--'],
    [t('FocalLength'), focalLength || '--'],
    [t('Aperture'), aperture || '--'],
    [t('Shutter'), fileInfo.exifData?.Shutter || '--'],
    [t('ISO'), fileInfo.exifData?.ISO || '--'],
  ]

  return (
    <div className="ml-4 w-[248px] shrink-0 overflow-auto">
      <div className="flex-center h-[143px]">
        {isImgError ? (
          <MingcuteFileMoreLine className="text-5xl text-default-500" />
        ) : (
          <div className="p-1 pt-0 shadow-md">
            <img src={imageSrc} alt="" className="h-[135px] object-contain" onError={onImgError} />
          </div>
        )}
      </div>

      <h2 className="mt-2 break-all text-base font-semibold">{fileInfo.filename}</h2>
      <p className="mt-1 text-xs text-default-500">{fileInfo.size}</p>
      <p className="mt-1 text-xs text-default-500">{fileInfo.created}</p>

      <div className="mb-1 mt-6 border-b pb-1 text-xs	font-bold">{t('Exif Information')}</div>
      <ul className="text-xs">
        {exifData.map(item => (
          <li className="mb-1 flex justify-between border-b pb-1" key={item[0]}>
            <span className="mr-6 shrink-0 font-medium text-default-500">{item[0]}</span>
            <span className="text-right font-medium">{item[1]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default FileView
