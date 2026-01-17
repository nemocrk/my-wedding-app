import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // Inizializza i18n
import App from './App.jsx'
import { initFontAutoLoader } from './utils/fontLoader'

initFontAutoLoader()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
