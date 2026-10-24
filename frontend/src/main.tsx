import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { I18nProvider } from './i18n/I18nProvider'
import { getDeviceId } from './lib/device'
import './index.css'

// Create the anonymous device ID on first load.
getDeviceId()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
)
