import { Language } from '@/const'
import { getLocalStorage, setLocalStorage } from '@/util'

const StorageKey = {
  Language: 'LANGUAGE',
  StrictMode: 'STRICT_MODE',
  UseCreatedDate: 'USE_CREATED_DATE',
  FormatOptions: 'FORMAT_OPTIONS',
}

export const storageService = {
  /**
   * Language configuration
   */
  getLanguage(): Language {
    const saved = getLocalStorage(StorageKey.Language)
    if (saved) return saved
    const browserLang = navigator.language || Language.EN
    return browserLang.toLowerCase().startsWith('zh') ? Language.ZH : Language.EN
  },
  setLanguage(language: Language): void {
    setLocalStorage(StorageKey.Language, language)
  },

  /**
   * Strict mode configuration
   */
  getStrictMode(): boolean {
    return !!getLocalStorage(StorageKey.StrictMode)
  },
  setStrictMode(enabled: boolean): void {
    setLocalStorage(StorageKey.StrictMode, enabled)
  },

  /**
   * Use created date configuration
   */
  getUseCreatedDate(): boolean {
    return !!getLocalStorage(StorageKey.UseCreatedDate)
  },
  setUseCreatedDate(enabled: boolean): void {
    setLocalStorage(StorageKey.UseCreatedDate, enabled)
  },

  /**
   * Format options history
   */
  getFormatOptions(): string[] {
    const ret = getLocalStorage(StorageKey.FormatOptions)
    if (ret) return ret
    return ['{YYYY}{MM}{DD} {hh}.{mm}.{ss}']
  },
  setFormatOptions(options: string[]): void {
    setLocalStorage(StorageKey.FormatOptions, options)
  },
}
