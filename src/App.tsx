import DropGuide from '@/components/DropGuide.tsx'
import DropModal from '@/components/DropModal.tsx'
import FilesTable from '@/components/FilesTable.tsx'
import FileView from '@/components/FileView.tsx'
import OperationBar from '@/components/OperationBar.tsx'
import Settings from '@/components/settings/Settings.tsx'
import SettingsTrigger from '@/components/settings/SettingsTrigger.tsx'
import { useDragging, useFiles } from '@/hooks'
import { useSettingsVisible } from '@/hooks/useSettingsVisible.ts'
import { AnimatePresence } from 'framer-motion'
import { Flip, ToastContainer } from 'react-toastify'

import 'react-toastify/dist/ReactToastify.css'

function App() {
  const { showSettings, setShowSettings } = useSettingsVisible()
  const {
    format,
    setFormat,
    setSelectedKey,
    files,
    selectedFile,
    handleOpenFolder,
    handleDropFiles,
    handleClickRename,
  } = useFiles()
  const hasFiles = files.length > 0
  const { isDragging } = useDragging({ disabled: showSettings, onDrop: handleDropFiles })
  const showDropModal = hasFiles && isDragging

  return (
    <div className="flex h-[100vh] p-4">
      <div className="flex w-full flex-col">
        <OperationBar
          format={format}
          onFormatChange={setFormat}
          hasFiles={hasFiles}
          onClickOpen={handleOpenFolder}
          onClickRename={handleClickRename}
        />

        {hasFiles ? (
          <FilesTable files={files} onSelectedKeyChange={setSelectedKey} />
        ) : (
          <DropGuide isDragging={isDragging} />
        )}
      </div>

      {selectedFile && <FileView fileInfo={selectedFile} key={selectedFile.pathname} />}

      {showSettings && <Settings />}
      <SettingsTrigger onClick={() => setShowSettings(val => !val)} />

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
