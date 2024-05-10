import { message } from '@tauri-apps/plugin-dialog'
import { useTranslation } from 'react-i18next'

export function useError() {
  const { t } = useTranslation()

  const handleError = ({ err, title, okLabel }: { err: unknown; title?: string; okLabel?: string }) => {
    let errorMsg = t('System Error')
    if (typeof err === 'string') {
      errorMsg = err
    } else {
      const error = err as Error
      if (error?.message) {
        errorMsg = error.message
      }
    }

    message(errorMsg, {
      title: title || t('System Error'),
      kind: 'error',
      okLabel: okLabel || t('Ok'),
    }).catch(() => {})
  }

  return {
    handleError,
  }
}
