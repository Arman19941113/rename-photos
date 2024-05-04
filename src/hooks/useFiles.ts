import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { listen, TauriEvent } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { useError } from '@/hooks'
import { formatDate, getDirPath } from '@/util'
import { TAURI_COMMAND } from '@/const'

export interface FileInfo {
  pathname: string
  filename: string
  modified: string
}

export function useFiles() {
  const { t } = useTranslation()
  const { handleError } = useError()
  const [isDragging, setIsDragging] = useState(false)
  const [dirPath, setDirPath] = useState('')
  const [files, setFiles] = useState<FileInfo[]>([])

  const selectFolder = async () => {
    try {
      const data = await open({
        multiple: false,
        directory: true,
        recursive: false,
      })
      if (!data) return
      getFilesFromDir(data).catch(() => {})
    } catch (e) {}
  }

  useEffect(() => {
    const promises = Promise.all([
      listen(TauriEvent.DRAG, () => {
        setIsDragging(true)
      }),
      listen<{ paths: string[] }>(TauriEvent.DROP, event => {
        setIsDragging(false)
        getFilesFromPaths(event.payload.paths).catch(() => {})
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

  async function getFilesFromPaths(paths: string[]) {
    try {
      if (!paths.length) return
      const res = await invoke<FilesResponse>(TAURI_COMMAND.GET_FILES_FROM_PATHS, { paths })
      if (!res.length) return
      setDirPath(getDirPath(paths[0]))
      setFiles(parseFilesResponse(res))
    } catch (e) {
      handleError({ e, title: t('Read Files Error') })
    }
  }

  async function getFilesFromDir(dirPath: string) {
    try {
      if (!dirPath) return
      const res = await invoke<FilesResponse>(TAURI_COMMAND.GET_FILES_FROM_DIR, { dirPath })
      setDirPath(dirPath)
      setFiles(parseFilesResponse(res))
    } catch (e) {
      handleError({ e, title: t('Read Folder Error') })
    }
  }

  return {
    isDragging,
    dirPath,
    files,
    selectFolder,
  }
}

function parseFilesResponse(res: FilesResponse): FileInfo[] {
  return res
    .map(item => ({
      pathname: item.pathname,
      filename: item.filename,
      modified: formatDate(item.modified),
    }))
    .sort((a, b) => (a.filename.toLowerCase() > b.filename.toLowerCase() ? 1 : -1))
}
