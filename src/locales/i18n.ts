import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUs from './en-us.ts'
import zhCn from './zh-cn.ts'

const resources = {
  en: {
    translation: enUs,
  },
  zh: {
    translation: zhCn,
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: navigator.language.startsWith('zh') ? 'zh' : 'en',
    interpolation: {
      escapeValue: false,
    },
  })
  .catch(() => {})

export default i18n
