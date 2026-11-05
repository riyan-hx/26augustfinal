import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './index.css'
import App from './App.tsx'
import { subdomainSlug } from './lib/links'

// A practice subdomain (anitha.lumidai.in) opens that practice's booking page.
const practiceSlug = subdomainSlug()
if (practiceSlug && window.location.pathname === '/') {
  window.history.replaceState(null, '', `/p/${encodeURIComponent(practiceSlug)}${window.location.search}${window.location.hash}`)
}

// Lumid is light-only. Some hosts (embedded previews, OS dark mode helpers)
// set data-theme="dark" or a .dark class on <html>; keep it light.
const root = document.documentElement
const keepLight = () => {
  if (root.dataset.theme !== 'light') root.dataset.theme = 'light'
  if (root.classList.contains('dark')) root.classList.remove('dark')
  if (root.style.colorScheme !== 'light') root.style.colorScheme = 'light'
}
keepLight()
new MutationObserver(keepLight).observe(root, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
