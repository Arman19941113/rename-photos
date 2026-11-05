import { useConfigStore } from '@/store/useConfigStore.ts'
import { listen, TauriEvent } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'

export function useDragging({ onDrop }: { onDrop: (paths: string[]) => void }) {
  const disabled = useConfigStore(state => state.visible)
  const [isDragging, setIsDragging] = useState(false)
  // FIX ME: useEffectEvent
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

  useEffect(() => {
    const promises = Promise.all([
      listen(TauriEvent.DRAG_ENTER, () => {
        if (disabledRef.current) return
        setIsDragging(true)
      }),
      listen<{ paths: string[] }>(TauriEvent.DRAG_DROP, event => {
        if (disabledRef.current) return
        setIsDragging(false)
        onDropRef.current(event.payload.paths)
      }),
      listen(TauriEvent.DRAG_LEAVE, () => {
        if (disabledRef.current) return
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
