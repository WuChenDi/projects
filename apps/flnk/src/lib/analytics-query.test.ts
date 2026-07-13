import { describe, expect, it } from 'vitest'
import { sanitize } from '@/lib/analytics-query'

describe('sanitize', () => {
  it('leaves normal values untouched', () => {
    expect(sanitize('en-US')).toBe('en-US')
    expect(sanitize('https://example.com/path')).toBe(
      'https://example.com/path',
    )
  })

  it('escapes single quotes so they cannot close the SQL literal', () => {
    expect(sanitize("a' OR '1'='1")).toBe("a\\' OR \\'1\\'=\\'1")
  })

  it('escapes backslashes before quotes (ClickHouse breakout)', () => {
    // A trailing backslash would otherwise escape the closing quote.
    expect(sanitize('x\\')).toBe('x\\\\')
    expect(sanitize("x\\'")).toBe("x\\\\\\'")
  })

  it('drops control characters', () => {
    expect(sanitize('a\x00b\x1fc\x7fd\te')).toBe('abcde')
  })
})
