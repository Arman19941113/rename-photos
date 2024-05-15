import aliPay from '@/assets/ali-pay.jpg'
import weChatPay from '@/assets/we-chat-pay.jpg'
import { Button } from '@nextui-org/button'
import { Modal, ModalBody, ModalContent, ModalHeader, useDisclosure } from '@nextui-org/modal'
import { useTranslation } from 'react-i18next'

function SponsorModal() {
  const { t } = useTranslation()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  return (
    <>
      <Button color="secondary" variant="flat" size="sm" className="ml-1 px-3 text-sm" onPress={onOpen}>
        ❤️ {t('buy me a cup of coffee')} ❤️
      </Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">❤️ {t('buy me a cup of coffee')} ❤️</ModalHeader>
          <ModalBody>
            <div className="flex h-56 items-center justify-between">
              <img src={weChatPay} alt="" width={190} height={190} />
              <img src={aliPay} alt="" width={190} height={190} className="" />
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

export default SponsorModal
