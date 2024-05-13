import { MingcuteHeartLine, RiSettings4Line, TablerHelpSquareRounded } from '@/components/icon'
import HelpDoc from '@/components/settings/HelpDoc.tsx'
import { Language, StorageKey } from '@/const'
import { Radio, RadioGroup } from '@nextui-org/radio'
import { Tab, Tabs } from '@nextui-org/tabs'
import { useTranslation } from 'react-i18next'

function Settings() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  const handleLangChange = (val: string) => {
    i18n
      .changeLanguage(val)
      .then(() => localStorage.setItem(StorageKey.LANGUAGE, val))
      .catch(() => {})
  }

  let tabs = [
    {
      id: 'Settings',
      title: (
        <div className="flex items-center">
          <RiSettings4Line className="mr-1 text-large" />
          <span>{t('Settings')}</span>
        </div>
      ),
      content: (
        <div className="mt-2 flex w-96 justify-between rounded-md border bg-default-100 px-4 py-3">
          <div>{t('Language')}</div>
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
      ),
    },
    {
      id: 'Help',
      title: (
        <div className="flex items-center">
          <TablerHelpSquareRounded className="mr-1 text-large" />
          <span>{t('Help')}</span>
        </div>
      ),
      content: <HelpDoc />,
    },
    {
      id: 'About',
      title: (
        <div className="flex items-center">
          <MingcuteHeartLine className="mr-1 text-large" />
          <span>{t('About')}</span>
        </div>
      ),
      content: <div>About</div>,
    },
  ]

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-white p-4">
      <Tabs items={tabs} color="secondary" variant="underlined" defaultSelectedKey="Help">
        {item => <Tab key={item.id} title={item.title} children={item.content} />}
      </Tabs>
    </div>
  )
}

export default Settings
