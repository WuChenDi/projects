import { describe, expect, test } from 'vitest'
import { hashPasswordFn, verifyPasswordFn } from '@/password'

describe('hashPasswordFn', () => {
  test('returns salt:hash hex string', async () => {
    const result = await hashPasswordFn('mypassword')
    expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)
  })

  test('salt segment is 32 hex chars (16 bytes)', async () => {
    const result = await hashPasswordFn('mypassword')
    const [saltHex] = result.split(':')
    expect(saltHex).toHaveLength(32)
  })

  test('hash segment is 64 hex chars (32 bytes)', async () => {
    const result = await hashPasswordFn('mypassword')
    const [, hashHex] = result.split(':')
    expect(hashHex).toHaveLength(64)
  })

  test('produces different hashes for same password (random salt)', async () => {
    const a = await hashPasswordFn('mypassword')
    const b = await hashPasswordFn('mypassword')
    expect(a).not.toBe(b)
  })

  test('produces deterministic hash when salt is provided', async () => {
    const salt = new Uint8Array(16).fill(42)
    const a = await hashPasswordFn('mypassword', salt)
    const b = await hashPasswordFn('mypassword', salt)
    expect(a).toBe(b)
  })

  test('different passwords produce different hashes with same salt', async () => {
    const salt = new Uint8Array(16).fill(1)
    const a = await hashPasswordFn('password1', salt)
    const b = await hashPasswordFn('password2', salt)
    expect(a).not.toBe(b)
  })
})

describe('verifyPasswordFn', () => {
  test('returns true for correct password', async () => {
    const hash = await hashPasswordFn('correct-password')
    expect(await verifyPasswordFn(hash, 'correct-password')).toBe(true)
  })

  test('returns false for wrong password', async () => {
    const hash = await hashPasswordFn('correct-password')
    expect(await verifyPasswordFn(hash, 'wrong-password')).toBe(false)
  })

  test('returns false for empty string attempt', async () => {
    const hash = await hashPasswordFn('correct-password')
    expect(await verifyPasswordFn(hash, '')).toBe(false)
  })

  test('is case-sensitive', async () => {
    const hash = await hashPasswordFn('Password')
    expect(await verifyPasswordFn(hash, 'password')).toBe(false)
    expect(await verifyPasswordFn(hash, 'PASSWORD')).toBe(false)
  })

  test('handles unicode passwords', async () => {
    const hash = await hashPasswordFn('密码123🔑')
    expect(await verifyPasswordFn(hash, '密码123🔑')).toBe(true)
    expect(await verifyPasswordFn(hash, '密码123')).toBe(false)
  })

  test('throws on malformed hash string', async () => {
    await expect(verifyPasswordFn('notavalidhash', 'any')).rejects.toThrow()
    await expect(verifyPasswordFn('', 'any')).rejects.toThrow()
  })
})
