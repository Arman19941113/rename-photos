import { TauriCommand } from '@/const'
import { useError } from './useError'
import { useConfigStore } from '@/store/useConfigStore.ts'
import type { IPCFile, RenamePathData } from '@/types/file'
import { transformIPCFiles } from '@/util'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

export function useFileOperations({ format, onRenamed }: { format: string; onRenamed: () => void }) {
  const { t } = useTranslation()
  const { handleError } = useError()

  const strictMode = useConfigStore(state => state.strictMode)
  const useCreatedDate = useConfigStore(state => state.useCreatedDate)

  const [ipcFiles, setIPCFiles] = useState<IPCFile[]>([])

  const files = useMemo(
    () => transformIPCFiles({ ipcFiles, strictMode, useCreatedDate, format, t }),
    [ipcFiles, strictMode, useCreatedDate, format, t],
  )

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
        invoke<IPCFile[]>(TauriCommand.GET_FILES_FROM_DIR, { dirPath })
          .then(ipcFiles => setIPCFiles(ipcFiles))
          .catch(err => handleError({ err, title: t('errors.readFolder') }))
      })
      .catch(err => {
        handleError({ err, title: t('errors.openFolder') })
      })
  }

  const handleDropFiles = (paths: string[]) => {
    invoke<IPCFile[]>(TauriCommand.GET_FILES_FROM_PATHS, { paths })
      .then(ipcFiles => setIPCFiles(ipcFiles))
      .catch(err => handleError({ err, title: t('errors.readFiles') }))
  }

  const [isRenaming, setIsRenaming] = useState(false)
  const renameInFlight = useRef(false)
  const handleClickRename = () => {
    if (renameInFlight.current) return

    const renameTargets = files.filter(item => !item.shouldSkip)

    // Build rename data and let the backend resolve filenames inside each source directory.
    const time = Date.now()
    const renamePathData: RenamePathData[] = renameTargets.map(item => ({
      oldPath: item.pathname,
      newFilename: item.newFilename,
      tempFilename: `${time}_${item.filename}`,
    }))

    if (!renamePathData.length) {
      toast.info(t('notifications.noRename'))
      return
    }

    // React batches state updates, so guard repeated calls synchronously as well.
    renameInFlight.current = true
    setIsRenaming(true)
    invoke<string[]>(TauriCommand.RENAME_FILES, { renamePathData })
      .then(res => {
        const pathnameList = files
          .filter(item => item.shouldSkip)
          .map(item => item.pathname)
          .concat(res)
        handleDropFiles(pathnameList)
        if (selectedKey) {
          const selectedTargetIndex = renameTargets.findIndex(item => item.pathname === selectedKey)
          if (selectedTargetIndex >= 0) {
            setSelectedKey(res[selectedTargetIndex])
          }
        }
        toast.success(t('notifications.renameSuccess'))
        onRenamed()
      })
      .catch(err => handleError({ err, title: t('errors.renameFiles') }))
      .finally(() => {
        renameInFlight.current = false
        setIsRenaming(false)
      })
  }

  return {
    files,
    isRenaming,
    handleOpenFolder,
    handleDropFiles,
    handleClickRename,
    selectedKey,
    selectedFile,
    setSelectedKey,
  }
}
