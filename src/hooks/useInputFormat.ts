import { useEffect, useState } from 'react'
import { storageService } from '@/services'

export function useInputFormat() {
  const [formatOptions, setFormatOptions] = useState<string[]>(() => storageService.getFormatOptions())
  const [inputValue, setInputValue] = useState(() => formatOptions[0])
  const [format, setFormat] = useState(() => formatOptions[0])

  useEffect(() => {
    storageService.setFormatOptions(formatOptions)
  }, [formatOptions])

  function updateLatestFormat(val: string) {
    const newHistory = [val, ...formatOptions.filter(item => item !== val)].slice(0, 5)
    setFormatOptions(newHistory)
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
