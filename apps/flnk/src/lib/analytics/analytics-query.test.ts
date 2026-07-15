import { describe, expect, it } from 'vitest'
import { countersSql, sanitize } from '@/lib/analytics/analytics-query'

// dataset() reads getConfig defaults (no env needed); an empty env is enough to
// exercise the SQL string builders.
const env = {} as CloudflareEnv

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

describe('whereClause owner scoping (via countersSql)', () => {
  it('omits the slug allow-list when ownerSlugs is undefined', () => {
    const sql = countersSql(env, { filters: {} })
    expect(sql).not.toContain('blob1 IN')
    expect(sql).not.toContain('1=0')
  })

  it('forces zero rows when ownerSlugs is empty (fail-closed)', () => {
    const sql = countersSql(env, { filters: {}, ownerSlugs: [] })
    expect(sql).toContain('1=0')
    expect(sql).not.toContain('blob1 IN')
  })

  it('restricts to the owned slugs when ownerSlugs is non-empty', () => {
    const sql = countersSql(env, { filters: {}, ownerSlugs: ['abc', 'xyz'] })
    expect(sql).toContain("blob1 IN ('abc', 'xyz')")
  })

  it('sanitizes slug values in the allow-list', () => {
    const sql = countersSql(env, { filters: {}, ownerSlugs: ["a'b"] })
    expect(sql).toContain("blob1 IN ('a\\'b')")
  })
})
