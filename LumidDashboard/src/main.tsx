import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './index.css'
import App from './App.tsx'
import { subdomainSlug } from './lib/links'

const practiceSlug = subdomainSlug()
if (practiceSlug && window.location.pathname === '/') {
  window.history.replaceState(null, '', `/p/${encodeURIComponent(practiceSlug)}${window.location.search}${window.location.hash}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
