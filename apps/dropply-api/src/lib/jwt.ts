import { subtle } from '@cdlab996/uncrypto'
import type {
  ChestJWTPayload,
  MultipartJWTPayload,
  UploadJWTPayload,
} from '@/types'

// Safely encode UTF-8 string to base64url
function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/[=]/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// Safely decode base64url to UTF-8 string
function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (padded.length % 4)) % 4)
  const base64 = padded + padding

  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const decoder = new TextDecoder()
  return decoder.decode(bytes)
}

// JWT signing
async function signJWT(payload: object, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encoder = new TextEncoder()
  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))

  const message = `${headerB64}.${payloadB64}`
  const key = await subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await subtle.sign('HMAC', key, encoder.encode(message))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/[=]/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${message}.${signatureB64}`
}

// JWT verification
async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  const [headerB64, payloadB64, signatureB64] = parts

  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Invalid JWT format')
  }

  const encoder = new TextEncoder()
  const message = `${headerB64}.${payloadB64}`
  const key = await subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const signature = Uint8Array.from(
    atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  )
  const isValid = await subtle.verify(
    'HMAC',
    key,
    signature,
    encoder.encode(message),
  )

  if (!isValid) {
    throw new Error('Invalid JWT signature')
  }

  const payload = JSON.parse(base64UrlDecode(payloadB64))

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error('JWT token expired')
  }

  return payload
}

export async function createUploadJWT(
  sessionId: string,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: UploadJWTPayload = {
    sessionId,
    type: 'upload',
    iat: now,
    exp: now + 24 * 60 * 60, // 24 hours
  }
  return signJWT(payload, secret)
}

export async function createChestJWT(
  sessionId: string,
  expiryTimestamp: Date | null,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = expiryTimestamp
    ? Math.floor(expiryTimestamp.getTime() / 1000)
    : now + 365 * 24 * 60 * 60 // Set to 1 year for permanent validity

  const payload: ChestJWTPayload = {
    sessionId,
    type: 'chest',
    iat: now,
    exp: expiry,
  }
  return signJWT(payload, secret)
}

export async function createMultipartJWT(
  sessionId: string,
  fileId: string,
  uploadId: string,
  filename: string,
  mimeType: string,
  fileSize: number,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: MultipartJWTPayload = {
    sessionId,
    fileId,
    uploadId,
    filename,
    mimeType,
    fileSize,
    type: 'multipart',
    iat: now,
    exp: now + 48 * 60 * 60, // 48 hours
  }
  return signJWT(payload, secret)
}

export async function verifyUploadJWT(
  token: string,
  secret: string,
): Promise<UploadJWTPayload> {
  const payload = await verifyJWT(token, secret)
  if (payload.type !== 'upload') {
    throw new Error('Invalid token type')
  }
  return payload as UploadJWTPayload
}

export async function verifyChestJWT(
  token: string,
  secret: string,
): Promise<ChestJWTPayload> {
  const payload = await verifyJWT(token, secret)
  if (payload.type !== 'chest') {
    throw new Error('Invalid token type')
  }
  return payload as ChestJWTPayload
}

export async function verifyMultipartJWT(
  token: string,
  secret: string,
): Promise<MultipartJWTPayload> {
  const payload = await verifyJWT(token, secret)
  if (payload.type !== 'multipart') {
    throw new Error('Invalid token type')
  }
  return payload as MultipartJWTPayload
}
