import { RiInformationLine } from '@/components/icon'
import { Language } from '@/const'
import { storageService } from '@/services'
import { updateStrictMode, updateUseCreatedDate, useConfigStore } from '@/store/useConfigStore.ts'
import { Radio, RadioGroup } from '@nextui-org/radio'
import { Switch } from '@nextui-org/switch'
import { Tooltip } from '@nextui-org/tooltip'
import { useTranslation } from 'react-i18next'

function Basic() {
  // language setting
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  const handleLangChange = (val: string) => {
    i18n
      .changeLanguage(val)
      .then(() => storageService.setLanguage(val as Language))
      .catch(() => {})
  }

  // strict mode setting
  const strictMode = useConfigStore(state => state.strictMode)
  const strictModeTooltip = t('settings.strict.tooltip')
  // use created date setting
  const useCreatedDate = useConfigStore(state => state.useCreatedDate)

  return (
    <div className="w-[564px]">
      {/* language setting */}
      <div className="mt-2 flex min-h-12 items-center justify-between rounded-md border bg-default-100 px-4">
        <div className="flex items-center">
          <h2 className="text-base font-medium">{t('settings.language')}</h2>
        </div>
        <RadioGroup
          size="sm"
          color="secondary"
          orientation="horizontal"
          defaultValue={currentLang}
          onValueChange={handleLangChange}
        >
          <Radio value={Language.EN} className="mr-1">
            English
          </Radio>
          <Radio value={Language.ZH}>简体中文</Radio>
        </RadioGroup>
      </div>

      {/* strict mode setting */}
      <div className="mt-3 flex min-h-12 items-center justify-between rounded-md border bg-default-100 px-4">
        <div className="flex items-center">
          <h2 className="text-base font-medium">{t('settings.strict.title')}</h2>
          <Tooltip color="secondary" showArrow radius="none" placement="right" content={strictModeTooltip}>
            <div className="px-1">
              <RiInformationLine className="text-large text-default-500" />
            </div>
          </Tooltip>
        </div>
        <Switch size="sm" color="secondary" isSelected={strictMode} onValueChange={updateStrictMode} />
      </div>

      {/* use created date setting */}
      <div className="mt-3 flex min-h-12 items-center justify-between rounded-md border bg-default-100 px-4">
        <div className="flex items-center">
          <h2 className="text-base font-medium">{t('settings.creationDate.title')}</h2>
          <Tooltip
            color="secondary"
            showArrow
            radius="none"
            placement="right"
            content={t('settings.creationDate.tooltip')}
          >
            <div className="px-1">
              <RiInformationLine className="text-large text-default-500" />
            </div>
          </Tooltip>
        </div>
        <Switch size="sm" color="secondary" isSelected={useCreatedDate} onValueChange={updateUseCreatedDate} />
      </div>
    </div>
  )
}

export default Basic
