import { RiInformationLine } from '@/components/icon'
import { Language, StorageKey } from '@/const'
import { updateExifMode, useConfigStore } from '@/store/useConfigStore.ts'
import { Radio, RadioGroup } from '@nextui-org/radio'
import { Switch } from '@nextui-org/switch'
import { Tooltip } from '@nextui-org/tooltip'
import { useTranslation } from 'react-i18next'

function Basic() {
  const exifMode = useConfigStore(state => state.mode.exif)
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  const handleLangChange = (val: string) => {
    i18n
      .changeLanguage(val)
      .then(() => localStorage.setItem(StorageKey.LANGUAGE, val))
      .catch(() => {})
  }

  return (
    <div className="w-[564px]">
      {/* language setting */}
      <div className="mt-2 flex min-h-12 items-center justify-between rounded-md border bg-default-100 px-4">
        <div className="flex items-center">
          <h2 className="text-base font-medium">{t('Language')}</h2>
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

      {/* exif mode setting */}
      <div className="mt-3 flex min-h-12 items-center justify-between rounded-md border bg-default-100 px-4">
        <div className="flex items-center">
          <h2 className="text-base font-medium">{t('EXIF Mode')}</h2>
          <Tooltip
            color="secondary"
            showArrow
            radius="none"
            placement="right"
            content={t('If enabled, only rename files with EXIF data.')}
          >
            <div className="px-1">
              <RiInformationLine className="text-large text-default-500" />
            </div>
          </Tooltip>
        </div>
        <Switch size="sm" color="secondary" isSelected={exifMode} onValueChange={updateExifMode} />
      </div>
    </div>
  )
}

export default Basic
