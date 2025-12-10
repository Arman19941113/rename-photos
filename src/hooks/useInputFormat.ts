import { useEffect, useState } from 'react'
import { storageService } from '@/services'

export function useInputFormat() {
  const [inputValue, setInputValue] = useState('')
  const [format, setFormat] = useState('')
  const [formatOptions, setFormatOptions] = useState<string[]>([])

  useEffect(() => {
    const history = storageService.getFormatOptions()
    setInputValue(history[0])
    setFormat(history[0])
    setFormatOptions(history)
    storageService.setFormatOptions(history)
  }, [])

  function updateLatestFormat(val: string) {
    const newHistory = [val, ...formatOptions.filter(item => item !== val)].slice(0, 5)
    setFormatOptions(newHistory)
    storageService.setFormatOptions(newHistory)
  }

  return {
    inputValue,
    setInputValue,
    format,
    setFormat,
    formatOptions,
    updateLatestFormat,
  }
}
