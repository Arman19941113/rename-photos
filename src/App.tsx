import { AnimatePresence } from 'framer-motion'
import { useFiles } from '@/hooks'
import OperationBar from '@/components/OperationBar.tsx'
import FilesTable from '@/components/FilesTable.tsx'
import FileView from '@/components/FileView.tsx'
import DropGuide from '@/components/DropGuide.tsx'
import DropModal from '@/components/DropModal.tsx'

function App() {
  const {
    isDragging,
    files,
    selectedFile,
    format,
    handleOpenFolder,
    handleClickRename,
    handleSelectFile,
    handleFormatChange,
  } = useFiles()
  const hasFiles = files.length > 0

  return (
    <div className="flex h-[100vh] p-5">
      <div className="flex w-full flex-col">
        <OperationBar
          hasFiles={hasFiles}
          format={format}
          onClickOpen={handleOpenFolder}
          onClickRename={handleClickRename}
          onFormatChange={handleFormatChange}
        />

        {hasFiles ? <FilesTable files={files} onRowClick={handleSelectFile} /> : <DropGuide isDragging={isDragging} />}
      </div>

      {selectedFile && <FileView fileInfo={selectedFile} />}

      {/* modal: dragging animation */}
      <AnimatePresence>{hasFiles && isDragging && DropModal()}</AnimatePresence>
    </div>
  )
}

export default App
