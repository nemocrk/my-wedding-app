import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // Inizializza i18n
import App from './App.jsx'
import { TextProvider } from './contexts/TextContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TextProvider>
      <App />
    </TextProvider>
  </StrictMode>,
)
