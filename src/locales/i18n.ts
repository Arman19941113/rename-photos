import { Language } from '@/const'
import { storageService } from '@/services'
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
const language = storageService.getLanguage()

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
