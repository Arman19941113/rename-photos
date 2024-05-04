import { useEffect, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { useTranslation } from 'react-i18next'
import { useError } from '@/hooks'
import { TAURI_COMMAND } from '@/const'
import { formatDate } from '@/util'
import { listen, TauriEvent } from '@tauri-apps/api/event'

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

  useEffect(() => {
    const promises = Promise.all([
      listen(TauriEvent.DRAG, () => {
        setIsDragging(true)
      }),
      listen(TauriEvent.DROP, event => {
        // @ts-ignore
        const paths = event.payload.paths as string[]
        console.log('DROP', paths)
        setIsDragging(false)
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

  async function selectFolder() {
    // Open a dialog
    const dirPath = await open({
      multiple: false,
      directory: true,
      recursive: false,
    })
    if (!dirPath) return

    try {
      const res = (await invoke(TAURI_COMMAND.GET_FILES_FROM_DIR, { dirPath })) as Array<{
        pathname: string
        filename: string
        modified: number
      }>
      setDirPath(dirPath)
      setFiles(
        res.map(item => ({
          pathname: item.pathname,
          filename: item.filename,
          modified: formatDate(item.modified),
        })),
      )
    } catch (e) {
      handleError({ e, title: t('Select Folder Error') })
    }
  }

  return {
    isDragging,
    dirPath,
    files,
    selectFolder,
  }
}
