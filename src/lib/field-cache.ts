export const FIELD_CACHE_PREFIX = "field-sheet-shell-"
export const FIELD_ROUTES = ["/", "/identify", "/journal", "/limits"] as const
export const OFFLINE_MISS_MARK = "data-field-sheet-offline-miss"
const COPY_FLAG = "field-sheet-worksheet-copy"

export type WorksheetCopyState = "checking" | "stored" | "failed"

export function worksheetCopyMessage(state: WorksheetCopyState): string {
  switch (state) {
    case "checking":
      return "Storing the worksheet on this phone. This is not a specimen record."
    case "stored":
      return "The worksheet is stored on this phone. The key, both plates and the journal can run offline. Records stay in this browser."
    case "failed":
      return "The offline copy did not store. No record was written."
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

export function documentIsWorksheet(html: string, contentType: string): boolean {
  if (!contentType.includes("text/html")) return false
  if (!html.includes("<html")) return false
  if (html.includes(OFFLINE_MISS_MARK)) return false
  return true
}

function cacheName(keys: string[]): string | undefined {
  return keys.find((key) => key.startsWith(FIELD_CACHE_PREFIX))
}

export async function routesCached(paths: readonly string[] = FIELD_ROUTES): Promise<boolean> {
  if (typeof caches === "undefined") return false
  const name = cacheName(await caches.keys())
  if (!name) return false
  const cache = await caches.open(name)
  for (const path of paths) {
    const hit = await cache.match(path)
    if (!hit) return false
    const html = await hit.text()
    if (!documentIsWorksheet(html, hit.headers.get("content-type") ?? "")) return false
  }
  return true
}

function waitForController(ms: number): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return Promise.resolve(false)
  if (navigator.serviceWorker.controller) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(Boolean(navigator.serviceWorker.controller)), ms)
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.clearTimeout(timer)
        resolve(true)
      },
      { once: true },
    )
  })
}

function loadFrame(path: string): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe")
    frame.hidden = true
    frame.setAttribute("aria-hidden", "true")
    frame.title = "Storing a worksheet page"
    const finish = () => {
      frame.remove()
      resolve()
    }
    const timer = window.setTimeout(finish, 20000)
    frame.addEventListener("load", () => {
      window.setTimeout(() => {
        window.clearTimeout(timer)
        finish()
      }, 1500)
    })
    frame.src = path
    document.body.appendChild(frame)
  })
}

export async function prepareWorksheetCopy(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (window.self !== window.top) return false
  if (!("serviceWorker" in navigator) || typeof caches === "undefined") return false
  try {
    await navigator.serviceWorker.register("/sw.js")
    const controlling = await waitForController(5000)
    if (!controlling) return false
    if (await routesCached()) {
      window.sessionStorage.setItem(COPY_FLAG, "worksheet")
      return true
    }
    for (const path of FIELD_ROUTES) {
      const response = await fetch(path, { cache: "reload" })
      if (!response.ok) return false
      await loadFrame(path)
    }
    const stored = await routesCached()
    if (stored) window.sessionStorage.setItem(COPY_FLAG, "worksheet")
    else window.sessionStorage.removeItem(COPY_FLAG)
    return stored
  } catch {
    try {
      window.sessionStorage.removeItem(COPY_FLAG)
    } catch {
      // The copy flag is not a specimen. Leaving it unset is the failure.
    }
    return false
  }
}
