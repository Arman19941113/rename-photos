import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { listen, TauriEvent } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { useError } from '@/hooks'
import { formatDate, formatFileSize, getDirFromFilePath } from '@/util'
import { ExifStatus, getInitialFormat, StorageKey, TauriCommand } from '@/const'
import { IpcFiles } from '@/types/rust'

export interface FileInfo {
  pathname: string
  filename: string
  modified: string
  size: string
  exifStatus: ExifStatus
  exifMsg: string
  exifData: IpcFiles[number]['exifData']
}

export function useFiles() {
  const { t } = useTranslation()
  const { handleError } = useError()
  const [isDragging, setIsDragging] = useState(false)
  const [dirPath, setDirPath] = useState('')
  const [files, setFiles] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [format, setFormat] = useState(getInitialFormat())

  const updateData = (data: { dirPath: string; ipcFiles: IpcFiles }) => {
    setDirPath(data.dirPath)
    setFiles(parseIpcFiles(data.ipcFiles))
    setSelectedFile(null)
  }

  const handleOpenFolder = async () => {
    try {
      const data = await open({
        multiple: false,
        directory: true,
        recursive: false,
      })
      if (!data) return
      updateForDirPath(data).catch(() => {})
    } catch (e) {}
  }

  const handleClickRename = async () => {
    console.log(format)
    localStorage.setItem(StorageKey.FORMAT, format)
  }

  useEffect(() => {
    const promises = Promise.all([
      listen(TauriEvent.DRAG, () => {
        setIsDragging(true)
      }),
      listen<{ paths: string[] }>(TauriEvent.DROP, event => {
        setIsDragging(false)
        updateForFilePaths(event.payload.paths).catch(() => {})
      }),
      listen(TauriEvent.DROP_CANCELLED, () => {
        setIsDragging(false)
      }),
    ])

    return () => {
      promises.then(([unDrag, unDrop, unDropCancel]) => {
        unDrag()
        unDrop()
        unDropCancel()
      })
    }
  }, [])

  async function updateForFilePaths(paths: string[]) {
    try {
      if (!paths.length) return
      const ipcFiles = await invoke<IpcFiles>(TauriCommand.GET_FILES_FROM_PATHS, { paths })
      if (!ipcFiles.length) return
      updateData({ dirPath: getDirFromFilePath(paths[0]), ipcFiles })
    } catch (e) {
      handleError({ e, title: t('Read Files Error') })
    }
  }

  async function updateForDirPath(dirPath: string) {
    try {
      if (!dirPath) return
      const ipcFiles = await invoke<IpcFiles>(TauriCommand.GET_FILES_FROM_DIR, { dirPath })
      updateData({ dirPath, ipcFiles })
    } catch (e) {
      handleError({ e, title: t('Read Folder Error') })
    }
  }

  function parseIpcFiles(ipcFiles: IpcFiles): FileInfo[] {
    return ipcFiles
      .map(item => {
        let exifStatus = ExifStatus.SUCCESS
        let exifMsg = ''
        const { exifData, exifError } = item
        if (exifError) {
          exifStatus = ExifStatus.ERROR
          exifMsg = exifError === 'Unknown image format' ? t('Unknown image format') : exifError
        } else if (Object.values(exifData!).some(val => val === null)) {
          exifStatus = ExifStatus.WARNING
          exifMsg = t('Missing exif data')
        }

        return {
          pathname: item.pathname,
          filename: item.filename,
          modified: formatDate(item.modified),
          size: formatFileSize(item.size),
          exifStatus,
          exifMsg,
          exifData,
        }
      })
      .sort((a, b) => (a.filename.toLowerCase() > b.filename.toLowerCase() ? 1 : -1))
  }

  return {
    isDragging,
    dirPath,
    files,
    selectedFile,
    format,
    handleOpenFolder,
    handleSelectFile: setSelectedFile,
    handleFormatChange: setFormat,
    handleClickRename,
  }
}
