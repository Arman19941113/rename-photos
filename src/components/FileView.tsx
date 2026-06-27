import { StreamlineUltimateColorDataFileSearch } from '@/components/icon'
import type { UIFile } from '@/types/file'
import { convertFileSrc } from '@tauri-apps/api/core'

import { clsx } from 'clsx'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// reset state by key
function FileView({ fileInfo }: { fileInfo: UIFile }) {
  const { t } = useTranslation()

  /* media source */
  const canPreview = canPreviewFile(fileInfo)
  const mediaSrc = canPreview ? convertFileSrc(fileInfo.pathname) : ''
  const videoRef = useRef<HTMLVideoElement>(null)
  const isPrimingVideoRef = useRef(true)
  const [isMediaLoaded, setIsMediaLoaded] = useState(false)
  const [isMediaError, setIsMediaError] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const onMediaLoad = () => setIsMediaLoaded(true)
  const onMediaError = () => setIsMediaError(true)
  const onVideoPlaying = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    setIsMediaLoaded(true)

    if (isPrimingVideoRef.current) {
      window.setTimeout(() => {
        video.pause()
        isPrimingVideoRef.current = false
        setIsVideoPlaying(false)
      }, 120)
      return
    }

    setIsVideoPlaying(true)
  }
  const onClickVideoPreview = () => {
    const video = videoRef.current

    if (!video) return

    isPrimingVideoRef.current = false
    video.play().catch(() => {})
  }
  const showFileIcon = !mediaSrc || isMediaError

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
          <StreamlineUltimateColorDataFileSearch className="text-6xl text-default-500" />
        ) : (
          <div className={clsx('p-1 pt-0', isMediaLoaded && 'shadow-md')}>
            {fileInfo.fileType === 'video' ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={mediaSrc}
                  className="h-[135px] max-w-[232px] object-contain"
                  autoPlay
                  muted
                  playsInline
                  controls={isVideoPlaying}
                  preload="auto"
                  onLoadedData={onMediaLoad}
                  onError={onMediaError}
                  onPlaying={onVideoPlaying}
                  onPause={() => {
                    if (!isPrimingVideoRef.current) {
                      setIsVideoPlaying(false)
                    }
                  }}
                />
                {isMediaLoaded && !isVideoPlaying ? (
                  <button
                    type="button"
                    aria-label="Play video preview"
                    className="absolute inset-0 flex items-center justify-center bg-transparent"
                    onClick={onClickVideoPreview}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                      <span className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-white" />
                    </span>
                  </button>
                ) : null}
              </div>
            ) : (
              <img
                src={mediaSrc}
                alt=""
                className="h-[135px] object-contain"
                onLoad={onMediaLoad}
                onError={onMediaError}
              />
            )}
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

function canPreviewFile(fileInfo: UIFile): boolean {
  const ext = getLowerExt(fileInfo.filename)

  if (fileInfo.fileType === 'image') {
    return canPreviewImageExt(ext)
  }

  if (fileInfo.fileType === 'video') {
    return canPreviewVideoExt(ext)
  }

  return false
}

function getLowerExt(filename: string): string {
  const ext = filename.split('.').pop()
  return ext && ext !== filename ? ext.toLowerCase() : ''
}

function canPreviewImageExt(ext: string): boolean {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'gif':
    case 'heic':
    case 'heif':
    case 'heics':
      return true
    default:
      return false
  }
}

function canPreviewVideoExt(ext: string): boolean {
  switch (ext) {
    case 'mp4':
    case 'mov':
    case 'm4v':
    case 'webm':
      return true
    default:
      return false
  }
}

export default FileView
