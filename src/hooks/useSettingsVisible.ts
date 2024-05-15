import { useEffect, useState } from 'react'

export function useSettingsVisible() {
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSettings(false)
      } else if ((event.metaKey || event.ctrlKey) && (event.key === ',' || event.key === '/')) {
        setShowSettings(val => !val)
      }
    }
    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [])

  return {
    showSettings,
    setShowSettings,
  }
}
