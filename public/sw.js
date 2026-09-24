const CACHE = "field-sheet-shell-v1"
const OFFLINE_MISS = "/offline.html"

function skipRequest(request, url) {
  if (request.method !== "GET") return true
  if (url.origin !== self.location.origin) return true
  if (url.pathname.startsWith("/_next/webpack-hmr")) return true
  if (url.pathname.startsWith("/_next/turbopack")) return true
  if (url.pathname.startsWith("/__nextjs")) return true
  if (url.pathname.includes("hot-update")) return true
  if (request.headers.get("rsc") === "1") return true
  if (request.headers.get("next-router-prefetch") === "1") return true
  if (request.headers.get("next-router-segment-prefetch") === "1") return true
  if (request.headers.get("next-action")) return true
  const accept = request.headers.get("accept") || ""
  if (accept.includes("text/x-component")) return true
  if (url.searchParams.has("_rsc")) return true
  return false
}

async function cached(cache, request) {
  return (await cache.match(request)) || (await cache.match(new URL(request.url).pathname))
}

async function fromNetwork(request) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    return await fetch(request, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function networkThenCache(request) {
  const cache = await caches.open(CACHE)
  const stored = await cached(cache, request)
  if (!self.navigator.onLine && stored) return stored
  try {
    const response = await fromNetwork(request)
    if (response && response.ok && response.type === "basic" && !response.redirected) {
      try {
        await cache.put(request, response.clone())
      } catch {
        // A failed cache write is not a specimen.
      }
    }
    return response
  } catch (error) {
    if (stored) return stored
    const again = await cached(cache, request)
    if (again) return again
    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_MISS)
      if (offline) return offline
    }
    throw error
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_MISS, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("field-sheet-shell-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (skipRequest(event.request, url)) return
  event.respondWith(networkThenCache(event.request))
})
