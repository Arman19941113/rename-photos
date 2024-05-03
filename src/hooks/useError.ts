import { useTranslation } from 'react-i18next'
import { message } from '@tauri-apps/plugin-dialog'

export function useError() {
  const { t } = useTranslation()

  const handleError = ({ e, title, okLabel }: { e: unknown; title?: string; okLabel?: string }) => {
    let errorMsg = t('System Error')
    if (typeof e === 'string') {
      errorMsg = e
    } else {
      const error = e as Error
      if (error?.message) {
        errorMsg = error.message
      }
    }

    message(errorMsg, {
      title: title || t('System Error'),
      kind: 'error',
      okLabel: okLabel || t('Ok'),
    }).catch()
  }

  return {
    handleError,
  }
}
