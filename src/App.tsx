import { AnimatePresence } from 'framer-motion'
import { useFiles } from '@/hooks'
import SelectFolder from '@/components/SelectFolder.tsx'
import DropArea from '@/components/DropArea.tsx'
import DropModal from '@/components/DropModal.tsx'
import FilesTable from '@/components/FilesTable.tsx'

function App() {
  const { dirPath, isDragging, files, selectFolder } = useFiles()
  const hasFiles = files.length > 0

  return (
    <div className="flex h-[100vh] flex-col p-5">
      <SelectFolder className="mb-4 h-8 shrink-0" dirPath={dirPath} onClick={selectFolder} />

      {/* files and selected file */}
      <div className="relative flex h-full">
        {hasFiles ? (
          // (5 * 2 + 8 + 4 + 4 + 32) * 4 = 232
          <>
            <div className="absolute left-4 right-4 top-0 z-10 h-4 bg-white"></div>
            <FilesTable className="h-[calc(100vh-232px)]" files={files} />
          </>
        ) : (
          <DropArea className="h-full w-full" isDragging={isDragging} />
        )}
      </div>

      {/* operation */}
      {hasFiles && <div className="mt-4 h-32 shrink-0 border">operation</div>}

      <AnimatePresence>{hasFiles && isDragging && DropModal()}</AnimatePresence>
    </div>
  )
}

export default App
