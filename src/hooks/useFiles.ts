import { getInitialFormat, StorageKey, TauriCommand } from '@/const'
import { useError } from '@/hooks'
import { FileInfo, transformIpcFiles } from '@/util'
import { invoke } from '@tauri-apps/api/core'
import { listen, TauriEvent } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function useFiles() {
  const { t } = useTranslation()
  const { handleError } = useError()
  const [isDragging, setIsDragging] = useState(false)
  const [ipcFiles, setIpcFiles] = useState<IpcFiles>([])
  const [files, setFiles] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [format, setFormat] = useState(getInitialFormat())

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
    localStorage.setItem(StorageKey.FORMAT, format)
  }

  useEffect(() => {
    setFiles(transformIpcFiles({ ipcFiles, format, t }))
  }, [ipcFiles, format, t])

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
      setIpcFiles(await invoke<IpcFiles>(TauriCommand.GET_FILES_FROM_PATHS, { paths }))
      setSelectedFile(null)
    } catch (e) {
      handleError({ e, title: t('Read Files Error') })
    }
  }

  async function invokeFromDir(dirPath: string) {
    try {
      if (!dirPath) return
      setIpcFiles(await invoke<IpcFiles>(TauriCommand.GET_FILES_FROM_DIR, { dirPath }))
      setSelectedFile(null)
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
