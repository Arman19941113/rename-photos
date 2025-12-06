import { message } from '@tauri-apps/plugin-dialog'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export function useError() {
  const { t } = useTranslation()

  const handleError = useCallback(
    ({ err, title, okLabel }: { err: unknown; title?: string; okLabel?: string }) => {
      let errorMsg = t('errors.system')
      if (typeof err === 'string') {
        errorMsg = err
      } else {
        const error = err as Error
        if (error?.message) {
          errorMsg = error.message
        }
      }

      message(errorMsg, {
        title: title || t('errors.system'),
        kind: 'error',
        okLabel: okLabel || t('common.ok'),
      }).catch(() => {})
    },
    [t],
  )

  return {
    handleError,
  }
}
