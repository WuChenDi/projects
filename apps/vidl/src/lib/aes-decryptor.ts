function removePadding(buffer: ArrayBuffer): ArrayBuffer {
  const outputBytes = buffer.byteLength
  const paddingBytes =
    outputBytes && new DataView(buffer).getUint8(outputBytes - 1)
  if (paddingBytes) {
    return buffer.slice(0, outputBytes - paddingBytes)
  }
  return buffer
}

export class AESDecryptor {
  private rcon: number[]
  private subMix: [Uint32Array, Uint32Array, Uint32Array, Uint32Array]
  private invSubMix: [Uint32Array, Uint32Array, Uint32Array, Uint32Array]
  private sBox: Uint32Array
  private invSBox: Uint32Array
  private key: Uint32Array
  private keySize: number
  private ksRows: number
  private keySchedule: Uint32Array
  private invKeySchedule: Uint32Array

  constructor() {
    this.rcon = [0x0, 0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]
    this.subMix = [
      new Uint32Array(256),
      new Uint32Array(256),
      new Uint32Array(256),
      new Uint32Array(256),
    ]
    this.invSubMix = [
      new Uint32Array(256),
      new Uint32Array(256),
      new Uint32Array(256),
      new Uint32Array(256),
    ]
    this.sBox = new Uint32Array(256)
    this.invSBox = new Uint32Array(256)
    this.key = new Uint32Array(0)
    this.keySize = 0
    this.ksRows = 0
    this.keySchedule = new Uint32Array(0)
    this.invKeySchedule = new Uint32Array(0)

    this.initTable()
  }

  private uint8ArrayToUint32Array(arrayBuffer: ArrayBuffer): Uint32Array {
    const view = new DataView(arrayBuffer)
    const newArray = new Uint32Array(4)
    for (let i = 0; i < 4; i++) {
      newArray[i] = view.getUint32(i * 4)
    }
    return newArray
  }

  private initTable(): void {
    const { sBox, invSBox, subMix, invSubMix } = this
    const [subMix0, subMix1, subMix2, subMix3] = subMix
    const [invSubMix0, invSubMix1, invSubMix2, invSubMix3] = invSubMix

    const d = new Uint32Array(256)
    let x = 0
    let xi = 0

    for (let i = 0; i < 256; i++) {
      d[i] = i < 128 ? i << 1 : (i << 1) ^ 0x11b
    }

    for (let i = 0; i < 256; i++) {
      let sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4)
      sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63
      sBox[x] = sx
      invSBox[sx] = x

      const x2 = d[x]
      const x4 = d[x2]
      const x8 = d[x4]

      let t = (d[sx] * 0x101) ^ (sx * 0x1010100)
      subMix0[x] = (t << 24) | (t >>> 8)
      subMix1[x] = (t << 16) | (t >>> 16)
      subMix2[x] = (t << 8) | (t >>> 24)
      subMix3[x] = t

      t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100)
      invSubMix0[sx] = (t << 24) | (t >>> 8)
      invSubMix1[sx] = (t << 16) | (t >>> 16)
      invSubMix2[sx] = (t << 8) | (t >>> 24)
      invSubMix3[sx] = t

      if (!x) {
        x = xi = 1
      } else {
        x = x2 ^ d[d[d[x8 ^ x2]]]
        xi ^= d[d[xi]]
      }
    }
  }

  expandKey(keyBuffer: ArrayBuffer): void {
    const key = this.uint8ArrayToUint32Array(keyBuffer)
    let sameKey = true
    let offset = 0

    while (offset < key.length && sameKey) {
      sameKey = key[offset] === this.key[offset]
      offset++
    }

    if (sameKey) {
      return
    }

    this.key = key
    const keySize = (this.keySize = key.length)

    if (keySize !== 4 && keySize !== 6 && keySize !== 8) {
      throw new Error(`Invalid aes key size=${keySize}`)
    }

    const ksRows = (this.ksRows = (keySize + 6 + 1) * 4)
    const keySchedule = (this.keySchedule = new Uint32Array(ksRows))
    const invKeySchedule = (this.invKeySchedule = new Uint32Array(ksRows))
    const { sBox, rcon, invSubMix } = this
    const [invSubMix0, invSubMix1, invSubMix2, invSubMix3] = invSubMix

    let prev: number
    let t: number

    for (let ksRow = 0; ksRow < ksRows; ksRow++) {
      if (ksRow < keySize) {
        prev = keySchedule[ksRow] = key[ksRow]
        continue
      }
      t = prev!

      if (ksRow % keySize === 0) {
        t = (t << 8) | (t >>> 24)
        t =
          (sBox[t >>> 24] << 24) |
          (sBox[(t >>> 16) & 0xff] << 16) |
          (sBox[(t >>> 8) & 0xff] << 8) |
          sBox[t & 0xff]
        t ^= rcon[(ksRow / keySize) | 0] << 24
      } else if (keySize > 6 && ksRow % keySize === 4) {
        t =
          (sBox[t >>> 24] << 24) |
          (sBox[(t >>> 16) & 0xff] << 16) |
          (sBox[(t >>> 8) & 0xff] << 8) |
          sBox[t & 0xff]
      }

      keySchedule[ksRow] = prev = (keySchedule[ksRow - keySize] ^ t) >>> 0
    }

    for (let invKsRow = 0; invKsRow < ksRows; invKsRow++) {
      const ksRow = ksRows - invKsRow
      if (invKsRow & 3) {
        t = keySchedule[ksRow]
      } else {
        t = keySchedule[ksRow - 4]
      }

      if (invKsRow < 4 || ksRow <= 4) {
        invKeySchedule[invKsRow] = t
      } else {
        invKeySchedule[invKsRow] =
          invSubMix0[sBox[t >>> 24]] ^
          invSubMix1[sBox[(t >>> 16) & 0xff]] ^
          invSubMix2[sBox[(t >>> 8) & 0xff]] ^
          invSubMix3[sBox[t & 0xff]]
      }

      invKeySchedule[invKsRow] = invKeySchedule[invKsRow] >>> 0
    }
  }

  private networkToHostOrderSwap(word: number): number {
    return (
      (word << 24) |
      ((word & 0xff00) << 8) |
      ((word & 0xff0000) >> 8) |
      (word >>> 24)
    )
  }

  decrypt(
    inputArrayBuffer: ArrayBuffer,
    offset: number,
    aesIV: ArrayBuffer,
    removePKCS7Padding: boolean,
  ): ArrayBuffer {
    const nRounds = this.keySize + 6
    const { invKeySchedule, invSBox, invSubMix } = this
    const [invSubMix0, invSubMix1, invSubMix2, invSubMix3] = invSubMix

    const initVector = this.uint8ArrayToUint32Array(aesIV)
    let initVector0 = initVector[0]
    let initVector1 = initVector[1]
    let initVector2 = initVector[2]
    let initVector3 = initVector[3]

    const inputInt32 = new Int32Array(inputArrayBuffer)
    const outputInt32 = new Int32Array(inputInt32.length)

    let t0: number
    let t1: number
    let t2: number
    let t3: number
    let s0: number
    let s1: number
    let s2: number
    let s3: number
    let inputWords0: number
    let inputWords1: number
    let inputWords2: number
    let inputWords3: number
    let ksRow: number

    const swapWord = this.networkToHostOrderSwap

    while (offset < inputInt32.length) {
      inputWords0 = swapWord(inputInt32[offset])
      inputWords1 = swapWord(inputInt32[offset + 1])
      inputWords2 = swapWord(inputInt32[offset + 2])
      inputWords3 = swapWord(inputInt32[offset + 3])

      s0 = inputWords0 ^ invKeySchedule[0]
      s1 = inputWords3 ^ invKeySchedule[1]
      s2 = inputWords2 ^ invKeySchedule[2]
      s3 = inputWords1 ^ invKeySchedule[3]

      ksRow = 4

      for (let i = 1; i < nRounds; i++) {
        t0 =
          invSubMix0[s0 >>> 24] ^
          invSubMix1[(s1 >> 16) & 0xff] ^
          invSubMix2[(s2 >> 8) & 0xff] ^
          invSubMix3[s3 & 0xff] ^
          invKeySchedule[ksRow]
        t1 =
          invSubMix0[s1 >>> 24] ^
          invSubMix1[(s2 >> 16) & 0xff] ^
          invSubMix2[(s3 >> 8) & 0xff] ^
          invSubMix3[s0 & 0xff] ^
          invKeySchedule[ksRow + 1]
        t2 =
          invSubMix0[s2 >>> 24] ^
          invSubMix1[(s3 >> 16) & 0xff] ^
          invSubMix2[(s0 >> 8) & 0xff] ^
          invSubMix3[s1 & 0xff] ^
          invKeySchedule[ksRow + 2]
        t3 =
          invSubMix0[s3 >>> 24] ^
          invSubMix1[(s0 >> 16) & 0xff] ^
          invSubMix2[(s1 >> 8) & 0xff] ^
          invSubMix3[s2 & 0xff] ^
          invKeySchedule[ksRow + 3]

        s0 = t0
        s1 = t1
        s2 = t2
        s3 = t3
        ksRow = ksRow + 4
      }

      t0 =
        (invSBox[s0 >>> 24] << 24) ^
        (invSBox[(s1 >> 16) & 0xff] << 16) ^
        (invSBox[(s2 >> 8) & 0xff] << 8) ^
        invSBox[s3 & 0xff] ^
        invKeySchedule[ksRow]
      t1 =
        (invSBox[s1 >>> 24] << 24) ^
        (invSBox[(s2 >> 16) & 0xff] << 16) ^
        (invSBox[(s3 >> 8) & 0xff] << 8) ^
        invSBox[s0 & 0xff] ^
        invKeySchedule[ksRow + 1]
      t2 =
        (invSBox[s2 >>> 24] << 24) ^
        (invSBox[(s3 >> 16) & 0xff] << 16) ^
        (invSBox[(s0 >> 8) & 0xff] << 8) ^
        invSBox[s1 & 0xff] ^
        invKeySchedule[ksRow + 2]
      t3 =
        (invSBox[s3 >>> 24] << 24) ^
        (invSBox[(s0 >> 16) & 0xff] << 16) ^
        (invSBox[(s1 >> 8) & 0xff] << 8) ^
        invSBox[s2 & 0xff] ^
        invKeySchedule[ksRow + 3]
      ksRow = ksRow + 3

      outputInt32[offset] = swapWord(t0 ^ initVector0)
      outputInt32[offset + 1] = swapWord(t3 ^ initVector1)
      outputInt32[offset + 2] = swapWord(t2 ^ initVector2)
      outputInt32[offset + 3] = swapWord(t1 ^ initVector3)

      initVector0 = inputWords0
      initVector1 = inputWords1
      initVector2 = inputWords2
      initVector3 = inputWords3

      offset = offset + 4
    }

    return removePKCS7Padding
      ? removePadding(outputInt32.buffer)
      : outputInt32.buffer
  }

  destroy(): void {
    this.key = undefined!
    this.keySize = undefined!
    this.ksRows = undefined!
    this.sBox = undefined!
    this.invSBox = undefined!
    this.subMix = undefined!
    this.invSubMix = undefined!
    this.keySchedule = undefined!
    this.invKeySchedule = undefined!
    this.rcon = undefined!
  }
}
