import _crypto from 'node:crypto'

// globalThis.crypto = _crypto.webcrypto as any

try {
  globalThis.crypto = _crypto.webcrypto as any
} catch {
  Object.defineProperty(globalThis, 'crypto', {
    value: _crypto.webcrypto,
    writable: true,
    configurable: true,
  })
}
