// Dev-only. Next's flight decoder waits on debug bytes that arrive over the
// HMR socket for the request id baked into the HTML. A cached document keeps
// that id, and the dev server will not send the bytes again. Replay the bytes
// saved while the page was online. This store is not a specimen record.
;(function () {
  var Native = window.WebSocket
  if (!Native || !window.indexedDB) return

  var DB_NAME = "field-sheet-shell-debug"
  var STORE = "chunks"

  function openDb() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = function () {
        var db = request.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      request.onsuccess = function () {
        resolve(request.result)
      }
      request.onerror = function () {
        reject(request.error)
      }
    })
  }

  function readChunks(requestId) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly")
        var request = tx.objectStore(STORE).get(requestId)
        request.onsuccess = function () {
          resolve(request.result || null)
        }
        request.onerror = function () {
          reject(request.error)
        }
      })
    })
  }

  function writeChunks(requestId, record) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).put(record, requestId)
        tx.oncomplete = function () {
          resolve()
        }
        tx.onerror = function () {
          reject(tx.error)
        }
      })
    })
  }

  function debugParts(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 2) return null
    var view = new DataView(buffer)
    if (view.getUint8(0) !== 0) return null
    var idLength = view.getUint8(1)
    if (buffer.byteLength < 2 + idLength) return null
    var requestId = new TextDecoder().decode(new Uint8Array(buffer, 2, idLength))
    var chunk = buffer.byteLength > 2 + idLength ? buffer.slice(2 + idLength) : null
    return { requestId: requestId, chunk: chunk }
  }

  function encode(requestId, chunk) {
    var idBytes = new TextEncoder().encode(requestId)
    var extra = chunk ? chunk.byteLength : 0
    var bytes = new Uint8Array(2 + idBytes.length + extra)
    bytes[0] = 0
    bytes[1] = idBytes.length
    bytes.set(idBytes, 2)
    if (chunk) bytes.set(new Uint8Array(chunk), 2 + idBytes.length)
    return bytes.buffer
  }

  function servedFromCache() {
    try {
      var nav = performance.getEntriesByType("navigation")[0]
      return Boolean(nav && nav.deliveryType === "cache-storage")
    } catch (error) {
      return false
    }
  }

  function FakeSocket(url) {
    this.url = String(url)
    this.readyState = 0
    this.binaryType = "blob"
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    this.onclose = null
    this.CONNECTING = 0
    this.OPEN = 1
    this.CLOSING = 2
    this.CLOSED = 3
  }

  FakeSocket.prototype.send = function () {}
  FakeSocket.prototype.close = function () {
    this.readyState = 3
  }
  FakeSocket.prototype.addEventListener = function (type, listener) {
    this["on" + type] = listener
  }
  FakeSocket.prototype.removeEventListener = function () {}

  function replay(fake) {
    var started = Date.now()
    function tick() {
      var requestId = self.__next_r
      if (!requestId) {
        if (Date.now() - started < 4000) setTimeout(tick, 20)
        return
      }
      readChunks(requestId)
        .then(function (record) {
          fake.readyState = 1
          if (typeof fake.onopen === "function") fake.onopen({ type: "open" })
          if (!record || !record.done || !record.chunks || !record.chunks.length) return
          record.chunks.forEach(function (chunk) {
            if (typeof fake.onmessage === "function") fake.onmessage({ data: encode(requestId, chunk) })
          })
          if (typeof fake.onmessage === "function") fake.onmessage({ data: encode(requestId, null) })
        })
        .catch(function () {})
    }
    setTimeout(tick, 0)
  }

  function WrappedSocket(url, protocols) {
    var href = String(url)
    if (href.indexOf("/_next/hmr") !== -1 && (navigator.onLine === false || servedFromCache())) {
      var fake = new FakeSocket(href)
      replay(fake)
      return fake
    }
    var real = protocols === undefined ? new Native(url) : new Native(url, protocols)
    var bag = { id: "", chunks: [] }
    real.addEventListener("message", function (event) {
      var parts = debugParts(event.data)
      if (!parts) return
      bag.id = parts.requestId
      if (parts.chunk) bag.chunks.push(parts.chunk)
      else writeChunks(bag.id, { chunks: bag.chunks.slice(), done: true }).catch(function () {})
    })
    return real
  }

  WrappedSocket.prototype = Native.prototype
  WrappedSocket.CONNECTING = Native.CONNECTING
  WrappedSocket.OPEN = Native.OPEN
  WrappedSocket.CLOSING = Native.CLOSING
  WrappedSocket.CLOSED = Native.CLOSED
  window.WebSocket = WrappedSocket
})()
