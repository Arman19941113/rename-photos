import { motion } from 'framer-motion'

function DropModal() {
  return (
    <motion.div
      className="fixed inset-2 z-50 overflow-hidden rounded-xl border-2 border-dashed border-pink-400 "
      initial={{ opacity: 0, transform: 'scale(.75)' }}
      animate={{ opacity: 1, transform: 'scale(1)' }}
      exit={{ opacity: 0, transform: 'scale(.75)' }}
    >
      <div className="h-full w-full bg-black/10" />
    </motion.div>
  )
}

export default DropModal
