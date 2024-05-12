import { Language, StorageKey } from '@/const'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUs from './en-us.ts'
import zhCn from './zh-cn.ts'

const resources = {
  [Language.EN]: {
    translation: enUs,
  },
  [Language.ZH]: {
    translation: zhCn,
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
