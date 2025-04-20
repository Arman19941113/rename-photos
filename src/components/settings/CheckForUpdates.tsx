import { checkForUpdates } from '@/util/check-for-updates'
import { Button } from '@nextui-org/button'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

function CheckForUpdates() {
  const { t } = useTranslation()

  const [isChecking, setIsChecking] = useState(false)
  const handleCheck = () => {
    setIsChecking(true)
    checkForUpdates({ t }).finally(() => {
      setIsChecking(false)
    })
  }

  return (
    <>
      <Button
        color="secondary"
        variant="flat"
        size="sm"
        className="ml-1 px-3 text-sm"
        isLoading={isChecking}
        onPress={handleCheck}
      >
        🚀 {t('Check for Updates')}
      </Button>
    </>
  )
}

export default CheckForUpdates
