import { Language, StorageKey } from '@/const'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import zh from './zh.json'

const resources = {
  [Language.EN]: {
    translation: en,
  },
  [Language.ZH]: {
    translation: zh,
  },
}
const language = localStorage.getItem(StorageKey.LANGUAGE) || navigator.language || Language.EN

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: language.toLowerCase().startsWith('zh') ? Language.ZH : Language.EN,
    interpolation: {
      escapeValue: false,
    },
  })
  .catch(() => {})

export default i18n
