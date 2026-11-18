import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { initLanguage } from './i18n'
import './index.css'
import './styles/calendar.css'
import './styles/finance.css'
import './styles/goals.css'

await initLanguage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
