import { listen, TauriEvent } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'

export function useDragging({ disabled, onDrop }: { disabled: boolean; onDrop: (paths: string[]) => void }) {
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const promises = Promise.all([
      listen(TauriEvent.DRAG, () => {
        if (disabled) return
        setIsDragging(true)
      }),
      listen<{ paths: string[] }>(TauriEvent.DROP, event => {
        if (disabled) return
        setIsDragging(false)
        onDrop(event.payload.paths)
      }),
      listen(TauriEvent.DROP_CANCELLED, () => {
        if (disabled) return
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

  return {
    isDragging,
  }
}
