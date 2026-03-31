import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { logger } from '@/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:30:00'))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('logger.log calls console.log with timestamp', () => {
    logger.log('test message')
    expect(console.log).toHaveBeenCalledTimes(1)
    const call = vi.mocked(console.log).mock.calls[0]!
    expect(call[0]).toMatch(/^\[.*\]$/)
    expect(call[1]).toBe('test message')
  })

  test('logger.info calls console.info with timestamp', () => {
    logger.info('info message')
    expect(console.info).toHaveBeenCalledTimes(1)
    const call = vi.mocked(console.info).mock.calls[0]!
    expect(call[0]).toMatch(/^\[.*\]$/)
    expect(call[1]).toBe('info message')
  })

  test('logger.warn calls console.warn with timestamp', () => {
    logger.warn('warning')
    expect(console.warn).toHaveBeenCalledTimes(1)
    const call = vi.mocked(console.warn).mock.calls[0]!
    expect(call[0]).toMatch(/^\[.*\]$/)
    expect(call[1]).toBe('warning')
  })

  test('logger.error calls console.error with timestamp', () => {
    logger.error('error!')
    expect(console.error).toHaveBeenCalledTimes(1)
    const call = vi.mocked(console.error).mock.calls[0]!
    expect(call[0]).toMatch(/^\[.*\]$/)
    expect(call[1]).toBe('error!')
  })

  test('logger.debug calls console.debug with timestamp', () => {
    logger.debug('debug info')
    expect(console.debug).toHaveBeenCalledTimes(1)
    const call = vi.mocked(console.debug).mock.calls[0]!
    expect(call[0]).toMatch(/^\[.*\]$/)
    expect(call[1]).toBe('debug info')
  })

  test('passes additional parameters through', () => {
    logger.log('msg', { key: 'value' }, 42)
    const call = vi.mocked(console.log).mock.calls[0]!
    expect(call[1]).toBe('msg')
    expect(call[2]).toEqual({ key: 'value' })
    expect(call[3]).toBe(42)
  })

  test('handles undefined message', () => {
    logger.log(undefined)
    const call = vi.mocked(console.log).mock.calls[0]!
    expect(call[1]).toBeUndefined()
  })
})
