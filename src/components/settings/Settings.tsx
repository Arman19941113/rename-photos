import { MingcuteHeartLine, RiSettings4Line, TablerHelpSquareRounded } from '@/components/icon'
import About from '@/components/settings/About.tsx'
import Basic from '@/components/settings/Basic.tsx'
import HelpDoc from '@/components/settings/HelpDoc.tsx'
import { toggleVisible, updateVisible, useConfigStore } from '@/store/useConfigStore.ts'
import { Modal, ModalBody, ModalContent } from '@nextui-org/modal'
import { Tab, Tabs } from '@nextui-org/tabs'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function Settings() {
  const { t } = useTranslation()

  // open or close settings page
  const visible = useConfigStore(state => state.visible)
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === ',' || event.key === '/')) toggleVisible()
    }
    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [])

  // setting tabs
  const [tab, setTab] = useState('Help')
  let tabs = [
    {
      id: 'Settings',
      title: (
        <div className="flex items-center">
          <RiSettings4Line className="mr-1 text-large" />
          <span>{t('Settings')}</span>
        </div>
      ),
      content: <Basic />,
    },
    {
      id: 'Help',
      title: (
        <div className="flex items-center">
          <TablerHelpSquareRounded className="mr-1 text-large" />
          <span>{t('Help')}</span>
        </div>
      ),
      content: <HelpDoc toggleVisible={toggleVisible} />,
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
          onClick={() => updateVisible(true)}
        >
          <RiSettings4Line />
        </motion.button>
      </div>

      <Modal
        backdrop="blur"
        isOpen={visible}
        onOpenChange={updateVisible}
        classNames={{ base: 'max-w-[652px] h-[540px] !my-0' }}
      >
        <ModalContent>
          <ModalBody>
            <div className="flex flex-col items-center bg-white p-4">
              <Tabs
                items={tabs}
                selectedKey={tab}
                onSelectionChange={key => setTab(key as string)}
                color="secondary"
                variant="underlined"
              >
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
