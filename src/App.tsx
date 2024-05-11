import DropGuide from '@/components/DropGuide.tsx'
import DropModal from '@/components/DropModal.tsx'
import FilesTable from '@/components/FilesTable.tsx'
import FileView from '@/components/FileView.tsx'
import OperationBar from '@/components/OperationBar.tsx'
import { useFiles } from '@/hooks'
import { AnimatePresence } from 'framer-motion'
import { Flip, ToastContainer } from 'react-toastify'

import 'react-toastify/dist/ReactToastify.css'

function App() {
  const {
    isDragging,
    files,
    selectedFile,
    format,
    handleOpenFolder,
    handleClickRename,
    handleSelectedKeyChange,
    handleFormatChange,
  } = useFiles()
  const hasFiles = files.length > 0

  return (
    <div className="flex h-[100vh] p-4">
      <div className="flex w-full flex-col">
        <OperationBar
          format={format}
          onFormatChange={handleFormatChange}
          hasFiles={hasFiles}
          onClickOpen={handleOpenFolder}
          onClickRename={handleClickRename}
        />

        {hasFiles ? (
          <FilesTable files={files} onSelectedKeyChange={handleSelectedKeyChange} />
        ) : (
          <DropGuide isDragging={isDragging} />
        )}
      </div>

      {selectedFile && <FileView fileInfo={selectedFile} key={selectedFile.pathname} />}

      {/* modal: dragging animation */}
      <AnimatePresence>{hasFiles && isDragging && DropModal()}</AnimatePresence>

      <ToastContainer
        theme="light"
        position="top-center"
        autoClose={1200}
        draggable
        closeOnClick
        pauseOnHover
        pauseOnFocusLoss={false}
        transition={Flip}
      />
    </div>
  )
}

export default App
