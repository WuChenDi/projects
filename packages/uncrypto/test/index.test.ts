import { expect, it, describe } from 'vitest'
import './polyfill'

import * as uncryptoNode from '../src/crypto.node'
import * as uncryptoWeb from '../src/crypto.web'

describe('uncrypto:node', () => {
  runTests(uncryptoNode)
})

describe('uncrypto:web', () => {
  runTests(uncryptoWeb)
})

function runTests(crypto: Crypto) {
  it('randomUUID should generate valid UUID v4', () => {
    const uuid = crypto.randomUUID()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )

    const uuid2 = crypto.randomUUID()
    expect(uuid).not.toBe(uuid2)
  })

  it('getRandomValues should fill array with random data', () => {
    const array = new Uint32Array(10)
    const originalArray = new Uint32Array(10)

    crypto.getRandomValues(array)

    expect(array).not.toEqual(originalArray)

    const smallArray = new Uint8Array(1)
    expect(() => crypto.getRandomValues(smallArray)).not.toThrow()
  })

  it('getRandomValues should work with different typed arrays', () => {
    const arrays = [new Uint8Array(5), new Uint16Array(5), new Uint32Array(5)]

    arrays.forEach((array) => {
      expect(() => crypto.getRandomValues(array)).not.toThrow()
    })
  })

  it('subtle should be defined', () => {
    expect(crypto.subtle).toBeDefined()
    expect(typeof crypto.subtle).toBe('object')
  })
}
