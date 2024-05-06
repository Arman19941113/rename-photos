import { AnimatePresence } from 'framer-motion'
import { useFiles } from '@/hooks'
import SelectFolder from '@/components/SelectFolder.tsx'
import DropArea from '@/components/DropArea.tsx'
import DropModal from '@/components/DropModal.tsx'
import FilesTable from '@/components/FilesTable.tsx'
import FileView from '@/components/FileView.tsx'

function App() {
  const { dirPath, isDragging, files, selectedFile, setSelectedFile, selectFolder } = useFiles()
  const hasFiles = files.length > 0

  return (
    <div className="flex h-[100vh] flex-col p-5">
      <SelectFolder className="mb-4 h-8 shrink-0" dirPath={dirPath} onClick={selectFolder} />

      {/* files and selected file */}
      <div className="flex h-full">
        {hasFiles ? (
          // (5 * 2 + 8 + 4 + 4 + 32) * 4 = 232
          <FilesTable className="h-[calc(100vh-232px)]" files={files} onRowClick={setSelectedFile} />
        ) : (
          <DropArea className="h-full w-full" isDragging={isDragging} />
        )}

        {selectedFile && <FileView className="w-60 shrink-0 pl-3" fileInfo={selectedFile} />}
      </div>

      {/* operation */}
      {hasFiles && <div className="mt-4 h-32 shrink-0 border">operation</div>}

      <AnimatePresence>{hasFiles && isDragging && DropModal()}</AnimatePresence>
    </div>
  )
}

export default App
