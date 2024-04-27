import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@nextui-org/button'
import { Input } from '@nextui-org/input'
import { TAURI_COMMAND } from '@/const'
import { useTranslation } from 'react-i18next'

function App() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [greetMsg, setGreetMsg] = useState('')

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke(TAURI_COMMAND.GREET, { name }))
  }

  return (
    <div className="h-[100vh]">
      <div className="flex">
        <Input value={name} onValueChange={setName} />
        <Button onClick={greet}>{t('Select Folder')}</Button>
      </div>
      {greetMsg}
    </div>
  )
}

export default App
