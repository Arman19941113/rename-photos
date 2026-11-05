import { HeroUIProvider } from '@heroui/system'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import '@/locales/i18n'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </React.StrictMode>,
)
