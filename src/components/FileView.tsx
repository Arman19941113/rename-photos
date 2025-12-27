import { MingcuteFileMoreLine } from '@/components/icon'
import type { UIFile } from '@/types/file'
import { convertFileSrc } from '@tauri-apps/api/core'

import { clsx } from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// reset state by key
function FileView({ fileInfo }: { fileInfo: UIFile }) {
  const { t } = useTranslation()

  /* image source */
  const canPreview =
    fileInfo.fileType === 'image' ? true : fileInfo.fileType === 'video' ? fileInfo.size < 50_000_000 : false
  const imageSrc = canPreview ? convertFileSrc(fileInfo.pathname) : ''
  const [isImgLoad, setIsImgLoad] = useState(false)
  const [isImgError, setIsImgError] = useState(false)
  const onImgLoad = () => setIsImgLoad(true)
  const onImgError = () => setIsImgError(true)
  const showFileIcon = !imageSrc || isImgError

  /* metadata */
  const metadata: Array<[string, string]> | null = (() => {
    if (fileInfo.fileType === 'video') {
      const md = fileInfo.metadata
      return [
        [t('metadata.date'), md?.date || '--'],
        [t('metadata.make'), md?.make || '--'],
        [t('metadata.camera'), md?.camera || '--'],
      ]
    }
    if (fileInfo.fileType === 'image') {
      const md = fileInfo.metadata
      return [
        [t('metadata.date'), md?.date || '--'],
        [t('metadata.make'), md?.make || '--'],
        [t('metadata.camera'), md?.camera || '--'],
        [t('metadata.lens'), md?.lens || '--'],
        [t('metadata.focalLength'), md?.focalLength ? `${md.focalLength} mm` : '--'],
        [t('metadata.aperture'), md?.aperture ? `f/${md.aperture}` : '--'],
        [t('metadata.shutter'), md?.shutter || '--'],
        [t('metadata.iso'), md?.iso || '--'],
      ]
    }
    return null
  })()

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
      {/* Basic Info */}
      <h2 className="mb-1 mt-2 break-all border-b pb-1 text-center text-base font-semibold">{fileInfo.filename}</h2>
      <ul className="text-xs font-medium">
        <li className="mb-1 flex justify-between border-b pb-1">
          <span className="mr-6 shrink-0 text-default-500">{t('table.fileSize')}</span>
          <span className="text-right">{fileInfo.fileSize}</span>
        </li>
        <li className="mb-1 flex justify-between border-b pb-1">
          <span className="mr-6 shrink-0 text-default-500">{t('table.dateCreated')}</span>
          <span className="text-right">{fileInfo.created}</span>
        </li>
      </ul>
      {/* Metadata */}
      {metadata ? (
        <>
          <div className="mb-1 mt-6 border-b pb-1 text-xs font-bold">{t('metadata.title')}</div>
          <ul className="text-xs font-medium">
            {metadata.map(item => (
              <li className="mb-1 flex justify-between border-b pb-1" key={item[0]}>
                <span className="mr-6 shrink-0 text-default-500">{item[0]}</span>
                <span className="text-right">{item[1]}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

export default FileView
