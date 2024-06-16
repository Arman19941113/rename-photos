import { ExifStatus, getInitialFormat, StorageKey, TauriCommand } from '@/const'
import { useError } from '@/hooks'
import { useConfigStore } from '@/store/useConfigStore.ts'
import { transformIpcFiles } from '@/util'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

export function useFiles() {
  const exifMode = useConfigStore(state => state.mode.exif)
  const { t } = useTranslation()
  const { handleError } = useError()
  const [format, setFormat] = useState(getInitialFormat())
  const [ipcFiles, setIpcFiles] = useState<IpcFiles>([])
  const files = useMemo(() => transformIpcFiles({ ipcFiles, exifMode, format, t }), [ipcFiles, exifMode, format, t])
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
  const handleClickRename = () => {
    if (isRenaming) return

    const time = Date.now()
    const renamePathData = files
      .filter(item => {
        // filter exif mode and same name files
        const isKeepName = exifMode && item.exifStatus !== ExifStatus.SUCCESS
        return !isKeepName && item.filename !== item.newFilename
      })
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
    invoke<string[]>(TauriCommand.RENAME_FILES, { renamePathData })
      .then(res => {
        // contact exif mode and same name files
        const pathnameList = files
          .filter(item => {
            const isKeepName = exifMode && item.exifStatus !== ExifStatus.SUCCESS
            return isKeepName || item.filename === item.newFilename
          })
          .map(item => item.pathname)
          .concat(res)
        handleDropFiles(pathnameList)
        toast.success(t('Rename Success!'))
      })
      .catch(err => handleError({ err, title: t('Rename Files Error') }))
      .finally(() => setIsRenaming(false))
  }

  return {
    format,
    setFormat,
    setSelectedKey,
    files,
    selectedFile,
    handleOpenFolder,
    handleDropFiles,
    handleClickRename,
  }
}
