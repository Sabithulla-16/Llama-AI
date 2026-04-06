const CACHE_NAME = 'llama-ai-cache-v2'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/brand_logo_zoom.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Keep API traffic network-only.
  if (url.pathname.startsWith('/v1/')) return

  // SPA navigation: network first, then fallback to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(async () => {
          const cachedPage = await caches.match(request)
          if (cachedPage) return cachedPage
          return caches.match('/index.html')
        }),
    )
    return
  }

  // Static assets: network first, then cache fallback to avoid stale app bundles.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        throw new Error('Network unavailable and no cached asset found')
      }),
  )
})
