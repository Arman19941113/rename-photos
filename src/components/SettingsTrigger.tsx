import { RiSettings4Line } from '@/components/icon'
import { motion } from 'framer-motion'

function SettingsTrigger({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed bottom-2 left-2 flex shrink-0 items-center text-base text-default-500">
      <motion.button
        className="p-1"
        whileHover={{ scale: 1.6, rotate: 90 }}
        whileTap={{ scale: 1.2, rotate: 180 }}
        onClick={onClick}
      >
        <RiSettings4Line />
      </motion.button>
    </div>
  )
}

export default SettingsTrigger
