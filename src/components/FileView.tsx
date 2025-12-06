import { MingcuteFileMoreLine } from '@/components/icon'
import { FileInfo } from '@/util'
import { convertFileSrc } from '@tauri-apps/api/core'

import { clsx } from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// reset state by key
function FileView({ fileInfo }: { fileInfo: FileInfo }) {
  const { t } = useTranslation()

  /* image source */
  const imageSrc = fileInfo.preview ? convertFileSrc(fileInfo.pathname) : ''
  const [isImgLoad, setIsImgLoad] = useState(false)
  const [isImgError, setIsImgError] = useState(false)
  const onImgLoad = () => setIsImgLoad(true)
  const onImgError = () => setIsImgError(true)
  const showFileIcon = !imageSrc || isImgError

  /* exif data */
  const rawData = fileInfo.exifData
  const exifData: Array<[string, string]> = [
    [t('exif.date'), rawData?.date || '--'],
    [t('exif.make'), rawData?.make || '--'],
    [t('exif.camera'), rawData?.camera || '--'],
    [t('exif.lens'), rawData?.lens || '--'],
    [t('exif.focalLength'), rawData?.focal_length ? `${rawData.focal_length} mm` : '--'],
    [t('exif.aperture'), rawData?.aperture ? `f/${rawData.aperture}` : '--'],
    [t('exif.shutter'), rawData?.shutter || '--'],
    [t('exif.iso'), rawData?.iso || '--'],
  ]

  return (
    <div className="ml-4 w-[248px] shrink-0 overflow-auto">
      <div className="flex-center h-[143px]">
        {showFileIcon ? (
          <MingcuteFileMoreLine className="text-5xl text-default-500" />
        ) : (
          <div className={clsx('p-1 pt-0', isImgLoad && 'shadow-md')}>
            <img src={imageSrc} alt="" className="h-[135px] object-contain" onLoad={onImgLoad} onError={onImgError} />
          </div>
        )}
      </div>

      <h2 className="mt-2 break-all text-center text-base font-semibold">{fileInfo.filename}</h2>
      <p className="mt-1 flex justify-between text-xs text-default-500">
        <span>{t('table.fileSize')}</span>
        <span>{fileInfo.size}</span>
      </p>
      <p className="mt-1 flex justify-between text-xs text-default-500">
        <span>{t('table.dateCreated')}</span>
        <span>{fileInfo.created}</span>
      </p>

      <div className="mb-1 mt-6 border-b pb-1 text-xs font-bold">{t('exif.title')}</div>
      <ul className="text-xs font-medium">
        {exifData.map(item => (
          <li className="mb-1 flex justify-between border-b pb-1" key={item[0]}>
            <span className="mr-6 shrink-0 text-default-500">{item[0]}</span>
            <span className="text-right">{item[1]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default FileView
