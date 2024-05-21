import { MingcuteHeartLine, RiSettings4Line, TablerHelpSquareRounded } from '@/components/icon'
import About from '@/components/settings/About.tsx'
import HelpDoc from '@/components/settings/HelpDoc.tsx'
import { Language, StorageKey } from '@/const'
import { Modal, ModalBody, ModalContent } from '@nextui-org/modal'
import { Radio, RadioGroup } from '@nextui-org/radio'
import { Tab, Tabs } from '@nextui-org/tabs'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

function Settings({
  showSettings,
  onSettingsChange,
}: {
  showSettings: boolean
  onSettingsChange: (val: boolean) => void
}) {
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
        <div className="w-[564px]">
          <div className="mt-2 flex justify-between rounded-md border bg-default-100 px-4 py-3">
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
      content: <About />,
    },
  ]

  return (
    <>
      <div className="fixed bottom-2 left-2 flex shrink-0 items-center text-base text-default-500">
        <motion.button
          className="p-1 outline-none"
          whileHover={{ scale: 1.6, rotate: 90 }}
          whileTap={{ scale: 1.2, rotate: 180 }}
          onClick={() => onSettingsChange(true)}
        >
          <RiSettings4Line />
        </motion.button>
      </div>

      <Modal
        backdrop="blur"
        isOpen={showSettings}
        onOpenChange={onSettingsChange}
        classNames={{ base: 'max-w-[652px] h-[500px] !my-0' }}
      >
        <ModalContent>
          <ModalBody>
            <div className="flex flex-col items-center bg-white p-4">
              <Tabs items={tabs} color="secondary" variant="underlined" defaultSelectedKey="Help">
                {item => <Tab key={item.id} title={item.title} children={item.content} />}
              </Tabs>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

export default Settings
