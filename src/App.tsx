import DropGuide from '@/components/DropGuide.tsx'
import DropModal from '@/components/DropModal.tsx'
import FilesTable from '@/components/FilesTable.tsx'
import FileView from '@/components/FileView.tsx'
import OperationBar from '@/components/OperationBar.tsx'
import Settings from '@/components/settings/Settings.tsx'
import { useDragging, useFileOperations } from '@/hooks'
import { useInputFormat } from '@/hooks/useInputFormat.ts'
import { AnimatePresence } from 'framer-motion'
import { Flip, ToastContainer } from 'react-toastify'

import 'react-toastify/dist/ReactToastify.css'

function App() {
  const { inputValue, setInputValue, format, setFormat, formatOptions, updateLatestFormat } = useInputFormat()
  const {
    files,
    handleOpenFolder,
    handleDropFiles,
    handleClickRename,
    // selected file operations
    selectedKey,
    selectedFile,
    setSelectedKey,
  } = useFileOperations({
    format,
    onRenamed: () => updateLatestFormat(format),
  })
  const hasFiles = files.length > 0
  const { isDragging } = useDragging({ onDrop: handleDropFiles })
  const showDropModal = hasFiles && isDragging

  return (
    <div className="flex h-[100vh] p-4">
      <div className="flex w-full flex-col">
        <OperationBar
          inputValue={inputValue}
          format={format}
          formatOptions={formatOptions}
          hasFiles={hasFiles}
          onInputValueChange={setInputValue}
          onFormatChange={setFormat}
          onClickOpen={handleOpenFolder}
          onClickRename={handleClickRename}
        />

        {hasFiles ? (
          <FilesTable files={files} selectedKey={selectedKey} onSelectedKeyChange={setSelectedKey} />
        ) : (
          <DropGuide isDragging={isDragging} />
        )}
      </div>

      {selectedFile && <FileView fileInfo={selectedFile} key={selectedFile.pathname} />}

      <Settings />

      <AnimatePresence>{showDropModal && <DropModal />}</AnimatePresence>

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
