import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker
        .register('/service-worker.js', { updateViaCache: 'none' })
        .then((registration) => {
          const requestWorkerActivation = () => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
          }

          requestWorkerActivation()

          registration.addEventListener('updatefound', () => {
            const installing = registration.installing
            if (!installing) return

            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed') {
                requestWorkerActivation()
              }
            })
          })

          let hasRefreshed = false
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (hasRefreshed) return
            hasRefreshed = true
            window.location.reload()
          })

          window.setTimeout(() => {
            void registration.update()
          }, 2500)
        })
    })
  } else {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    })
  }
}
