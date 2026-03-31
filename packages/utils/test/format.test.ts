import { describe, expect, test } from 'vitest'
import { formatBytes, formatFileSize } from '@/format'

describe('formatBytes', () => {
  test('returns "0 B" for zero or negative bytes', () => {
    expect(formatBytes({ bytes: 0 })).toBe('0 B')
    expect(formatBytes({ bytes: -1 })).toBe('0 B')
    expect(formatBytes({ bytes: -100 })).toBe('0 B')
  })

  test('formats bytes correctly', () => {
    expect(formatBytes({ bytes: 1 })).toBe('1.0 B')
    expect(formatBytes({ bytes: 500 })).toBe('500.0 B')
    expect(formatBytes({ bytes: 1023 })).toBe('1023.0 B')
  })

  test('formats kilobytes correctly', () => {
    expect(formatBytes({ bytes: 1024 })).toBe('1.0 KB')
    expect(formatBytes({ bytes: 1536 })).toBe('1.5 KB')
    expect(formatBytes({ bytes: 10240 })).toBe('10.0 KB')
  })

  test('formats megabytes correctly', () => {
    expect(formatBytes({ bytes: 1048576 })).toBe('1.0 MB')
    expect(formatBytes({ bytes: 1572864 })).toBe('1.5 MB')
  })

  test('formats gigabytes correctly', () => {
    expect(formatBytes({ bytes: 1073741824 })).toBe('1.0 GB')
  })

  test('formats terabytes correctly', () => {
    expect(formatBytes({ bytes: 1099511627776 })).toBe('1.0 TB')
  })

  test('clamps to TB for very large values', () => {
    expect(formatBytes({ bytes: 1099511627776 * 1024 })).toBe('1024.0 TB')
  })

  test('respects custom decimals', () => {
    expect(formatBytes({ bytes: 1536, decimals: 0 })).toBe('2 KB')
    expect(formatBytes({ bytes: 1536, decimals: 2 })).toBe('1.50 KB')
    expect(formatBytes({ bytes: 1536, decimals: 3 })).toBe('1.500 KB')
  })
})

describe('formatFileSize', () => {
  test('returns "0 B" for zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  test('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(1)).toBe('1 B')
  })

  test('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  test('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1572864)).toBe('1.5 MB')
  })

  test('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB')
    expect(formatFileSize(1610612736)).toBe('1.5 GB')
  })

  test('trims trailing zeros', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1024)).toBe('1 KB')
  })
})
