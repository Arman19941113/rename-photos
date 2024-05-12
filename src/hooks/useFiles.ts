import { getInitialFormat, StorageKey, TauriCommand } from '@/const'
import { useError } from '@/hooks'
import { transformIpcFiles } from '@/util'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

export function useFiles() {
  const { t } = useTranslation()
  const { handleError } = useError()
  const [format, setFormat] = useState(getInitialFormat())
  const [ipcFiles, setIpcFiles] = useState<IpcFiles>([])
  const files = useMemo(() => transformIpcFiles({ ipcFiles, format, t }), [ipcFiles, format, t])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selectedFile = files.find(file => file.pathname === selectedKey) ?? null

  const handleOpenFolder = () => {
    open({
      multiple: false,
      directory: true,
      recursive: false,
    })
      .then(dirPath => {
        if (!dirPath) return
        invoke<IpcFiles>(TauriCommand.GET_FILES_FROM_DIR, { dirPath })
          .then(ipcFiles => setIpcFiles(ipcFiles))
          .catch(err => handleError({ err, title: t('Read Folder Error') }))
      })
      .catch(err => {
        handleError({ err, title: t('Open Folder Error') })
      })
  }

  const handleDropFiles = (paths: string[]) => {
    invoke<IpcFiles>(TauriCommand.GET_FILES_FROM_PATHS, { paths })
      .then(ipcFiles => setIpcFiles(ipcFiles))
      .catch(err => handleError({ err, title: t('Read Files Error') }))
  }

  const [isRenaming, setIsRenaming] = useState(false)
  const handleRename = () => {
    if (isRenaming) return

    const time = Date.now()
    const renamePathData = files
      .filter(item => item.filename !== item.newFilename)
      .map(item => [
        `${item.dirname}/${item.filename}`,
        `${item.dirname}/${item.newFilename}`,
        `${item.dirname}/${time}_${item.filename}`,
      ])
    if (!renamePathData.length) {
      toast.info(t('No need to perform renaming'))
      return
    }

    localStorage.setItem(StorageKey.FORMAT, format)
    setIsRenaming(true)
    invoke<IpcFiles>(TauriCommand.RENAME_FILES, { renamePathData })
      .then(ipcFiles => {
        setIpcFiles(ipcFiles)
        toast.success(t('Rename Success!'))
      })
      .catch(err => handleError({ err, title: t('Rename Files Error') }))
      .finally(() => setIsRenaming(false))
  }

  return {
    format,
    handleFormatChange: setFormat,
    files,
    selectedFile,
    handleOpenFolder,
    handleDropFiles,
    handleRename,
    handleSelectedKeyChange: setSelectedKey,
  }
}
