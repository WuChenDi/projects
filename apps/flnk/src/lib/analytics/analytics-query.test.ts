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
  it('always filters by blob20 for a scoped query', () => {
    const sql = countersSql(env, { filters: {}, ownerKey: 'a@b.com' })
    expect(sql).toContain("blob20 = 'a@b.com'")
  })

  it('sanitizes the ownerKey value', () => {
    const sql = countersSql(env, { filters: {}, ownerKey: "a'b" })
    expect(sql).toContain("blob20 = 'a\\'b'")
  })

  it('omits the owner filter only for an explicit unscoped query', () => {
    const sql = countersSql(env, { filters: {}, unscoped: true })
    expect(sql).not.toContain('blob20')
  })

  it('is fail-closed: omitting both ownerKey and unscoped is a type error and throws', () => {
    expect(() =>
      // @ts-expect-error — a scoped query MUST carry ownerKey; omitting owner
      // scope entirely is unrepresentable (the old fail-open all-tenants call).
      countersSql(env, { filters: {} }),
    ).toThrow()
  })
})
