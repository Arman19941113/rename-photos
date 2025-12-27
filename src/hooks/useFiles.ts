import { TauriCommand } from '@/const'
import { useError } from '@/hooks'
import { useConfigStore } from '@/store/useConfigStore.ts'
import type { IPCFile } from '@/types/file'
import { transformIPCFiles } from '@/util'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

/**
 * Hook for managing file operations including opening folders,
 * handling drag-and-drop files, and batch renaming.
 */
export function useFileOperations({ format, onRenamed }: { format: string; onRenamed: () => void }) {
  // Utilities
  const { t } = useTranslation()
  const { handleError } = useError()

  // Configuration
  const strictMode = useConfigStore(state => state.strictMode)
  const useCreatedDate = useConfigStore(state => state.useCreatedDate)

  // Raw IPC file data from Tauri backend
  const [ipcFiles, setIPCFiles] = useState<IPCFile[]>([])

  // Transformed file list with computed new filenames
  const files = useMemo(
    () => transformIPCFiles({ ipcFiles, strictMode, useCreatedDate, format, t }),
    [ipcFiles, strictMode, useCreatedDate, format, t],
  )

  // Currently selected file for preview
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selectedFile = files.find(file => file.pathname === selectedKey) ?? null

  /**
   * Open a native folder picker dialog and load files from the selected directory
   */
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

  /**
   * Load files from drag-and-drop paths
   */
  const handleDropFiles = (paths: string[]) => {
    invoke<IPCFile[]>(TauriCommand.GET_FILES_FROM_PATHS, { paths })
      .then(ipcFiles => setIPCFiles(ipcFiles))
      .catch(err => handleError({ err, title: t('errors.readFiles') }))
  }

  //  Rename Operations
  const [isRenaming, setIsRenaming] = useState(false)
  /**
   * Execute batch rename operation for all files that need renaming.
   * Uses a temporary filename with timestamp to avoid naming conflicts.
   */
  const handleClickRename = () => {
    if (isRenaming) return

    // Collect files that actually need renaming and map their old/new paths
    const renameTargets = files.filter(item => !item.shouldSkip)
    // Map: originalPath -> targetPath
    const renameMapping = new Map(renameTargets.map(item => [item.pathname, `${item.dirname}/${item.newFilename}`]))

    // Build rename data: [originalPath, targetPath, tempPath]
    const time = Date.now()
    const renamePathData = renameTargets.map(item => [
      `${item.dirname}/${item.filename}`,
      `${item.dirname}/${item.newFilename}`,
      `${item.dirname}/${time}_${item.filename}`,
    ])

    // Skip if no files need renaming
    if (!renamePathData.length) {
      toast.info(t('notifications.noRename'))
      return
    }

    setIsRenaming(true)
    invoke<string[]>(TauriCommand.RENAME_FILES, { renamePathData })
      .then(res => {
        // Reload files: combine unchanged files with newly renamed ones
        const pathnameList = files
          .filter(item => item.shouldSkip)
          .map(item => item.pathname)
          .concat(res)
        handleDropFiles(pathnameList)
        // Preserve selection: move it to the renamed path if applicable
        if (selectedKey) {
          const nextKey = renameMapping.get(selectedKey)
          if (nextKey) {
            setSelectedKey(nextKey)
          }
        }
        toast.success(t('notifications.renameSuccess'))
        onRenamed()
      })
      .catch(err => handleError({ err, title: t('errors.renameFiles') }))
      .finally(() => setIsRenaming(false))
  }

  return {
    files,
    handleOpenFolder,
    handleDropFiles,
    handleClickRename,
    selectedKey,
    selectedFile,
    setSelectedKey,
  }
}
