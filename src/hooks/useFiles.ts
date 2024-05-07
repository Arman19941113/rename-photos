import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { listen, TauriEvent } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { useError } from '@/hooks'
import { FileInfo, transformIpcFiles } from '@/util'
import { getInitialFormat, StorageKey, TauriCommand } from '@/const'

export function useFiles() {
  const { t } = useTranslation()
  const { handleError } = useError()
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [format, setFormat] = useState(getInitialFormat())

  const handleIpcFilesComing = (ipcFiles: IpcFiles) => {
    setFiles(transformIpcFiles(ipcFiles, t))
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
      invokeFromDir(data).catch(() => {})
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
        invokeFromPaths(event.payload.paths).catch(() => {})
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

  async function invokeFromPaths(paths: string[]) {
    try {
      if (!paths.length) return
      const ipcFiles = await invoke<IpcFiles>(TauriCommand.GET_FILES_FROM_PATHS, { paths })
      if (!ipcFiles.length) return
      handleIpcFilesComing(ipcFiles)
    } catch (e) {
      handleError({ e, title: t('Read Files Error') })
    }
  }

  async function invokeFromDir(dirPath: string) {
    try {
      if (!dirPath) return
      const ipcFiles = await invoke<IpcFiles>(TauriCommand.GET_FILES_FROM_DIR, { dirPath })
      handleIpcFilesComing(ipcFiles)
    } catch (e) {
      handleError({ e, title: t('Read Folder Error') })
    }
  }

  return {
    isDragging,
    files,
    selectedFile,
    format,
    handleOpenFolder,
    handleSelectFile: setSelectedFile,
    handleFormatChange: setFormat,
    handleClickRename,
  }
}
