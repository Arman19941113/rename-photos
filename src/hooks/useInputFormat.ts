import { StorageKey } from '@/const'
import { useEffect, useState } from 'react'

export function useInputFormat() {
  const [format, setFormat] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [formatOptions, setFormatOptions] = useState<string[]>([])

  useEffect(() => {
    let history = localStorage.getItem(StorageKey.INPUT_HISTORY) || ''
    if (!history) {
      const history = JSON.stringify(['{YYYY}{MM}{DD} {hh}.{mm}.{ss}'])
      localStorage.setItem(StorageKey.INPUT_HISTORY, history)
    }
    try {
      const newHistory = JSON.parse(history)
      setInputValue(newHistory[0])
      setFormat(newHistory[0])
      setFormatOptions(newHistory)
    } catch (e) {}
  }, [])

  function addFormatOption(val: string) {
    const index = formatOptions.indexOf(val)
    if (index !== -1) formatOptions.splice(index, 1)

    const newHistory = [val, ...formatOptions].slice(0, 5)
    setFormatOptions(newHistory)
    localStorage.setItem(StorageKey.INPUT_HISTORY, JSON.stringify(newHistory))
  }

  return {
    format,
    setFormat,
    inputValue,
    setInputValue,
    formatOptions,
    addFormatOption,
  }
}
