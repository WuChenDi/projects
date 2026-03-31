/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { copyToClipboard } from '@/clipboard'

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clean up execCommand if we defined it
    if ('execCommand' in document) {
      // @ts-expect-error cleanup mock
      document.execCommand = undefined
    }
  })

  function mockExecCommand(returnValue: boolean) {
    // jsdom does not implement execCommand, define it manually
    document.execCommand = vi.fn().mockReturnValue(returnValue)
  }

  test('returns false for empty string', async () => {
    expect(await copyToClipboard('')).toBe(false)
    expect(console.warn).toHaveBeenCalled()
  })

  test('returns false for non-string input', async () => {
    // @ts-expect-error testing invalid input
    expect(await copyToClipboard(null)).toBe(false)
    // @ts-expect-error testing invalid input
    expect(await copyToClipboard(undefined)).toBe(false)
    // @ts-expect-error testing invalid input
    expect(await copyToClipboard(123)).toBe(false)
  })

  test('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    const result = await copyToClipboard('hello')
    expect(result).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  test('returns false when clipboard API is unavailable and fallback disabled', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const result = await copyToClipboard('hello', { fallbackToLegacy: false })
    expect(result).toBe(false)
  })

  test('returns false when clipboard API fails and fallback disabled', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
      configurable: true,
    })

    const result = await copyToClipboard('hello', { fallbackToLegacy: false })
    expect(result).toBe(false)
  })

  test('falls back to legacy copy when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    mockExecCommand(true)

    const result = await copyToClipboard('hello')
    expect(result).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  test('falls back to legacy copy when clipboard API throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
      configurable: true,
    })
    mockExecCommand(true)

    const result = await copyToClipboard('hello')
    expect(result).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  test('returns false when both clipboard API and legacy copy fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
      configurable: true,
    })
    mockExecCommand(false)

    const result = await copyToClipboard('hello')
    expect(result).toBe(false)
  })

  test('legacy copy creates and cleans up textarea', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    mockExecCommand(true)

    await copyToClipboard('test text')

    // textarea should be cleaned up after copy
    const textareas = document.querySelectorAll('textarea')
    expect(textareas.length).toBe(0)
  })
})
