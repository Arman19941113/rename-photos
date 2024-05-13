import { listen, TauriEvent } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'

export function useDragging({ disabled, onDrop }: { disabled: boolean; onDrop: (paths: string[]) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  // FIX ME: useEffectEvent
  const refDisabled = useRef(disabled)
  refDisabled.current = disabled
  const refOnDrop = useRef(onDrop)
  refOnDrop.current = onDrop

  useEffect(() => {
    const promises = Promise.all([
      listen(TauriEvent.DRAG, () => {
        if (refDisabled.current) return
        setIsDragging(true)
      }),
      listen<{ paths: string[] }>(TauriEvent.DROP, event => {
        if (refDisabled.current) return
        setIsDragging(false)
        refOnDrop.current(event.payload.paths)
      }),
      listen(TauriEvent.DROP_CANCELLED, () => {
        if (refDisabled.current) return
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
