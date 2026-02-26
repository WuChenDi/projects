import { base58 } from '@scure/base'
import { HDKey } from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import ecies from 'eciesjs'

// eslint-disable-next-line quotes
const DEFAULT_DERIVATION_PATH = "m/44'/0'/0'/0/0"

// console.log(bip39.generateMnemonic(wordlist)) // blouse size crystal critic this slow rotate run neglect regret mind head

const aliceMnemonic =
  'gallery nut tank snake doll kiss toddler sign era magnet battle gap'
const bobMnemonic =
  'hello popular adapt this mix scale dial cat shop top rice iron'

const aliceSeed = bip39.mnemonicToSeedSync(aliceMnemonic)
const bobSeed = bip39.mnemonicToSeedSync(bobMnemonic)

const aliceKey = HDKey.fromMasterSeed(aliceSeed)
const bobKey = HDKey.fromMasterSeed(bobSeed)

const alice = aliceKey.derive(DEFAULT_DERIVATION_PATH)
const bob = bobKey.derive(DEFAULT_DERIVATION_PATH)

const alicePubkey = base58.encode(alice.pubKey)
const bobPubkey = base58.encode(bob.pubKey)

console.log('alicePubkey', alicePubkey)
console.log('bobPubkey', bobPubkey)

const msgToBob = Buffer.from('hello bob')
const msgToAlice = Buffer.from('hello alice')

const encodedtoBob = ecies.encrypt(bob.pubKey, msgToBob)
const encodedtoAlice = ecies.encrypt(alice.pubKey, msgToAlice)

const decodedFromBob = ecies.decrypt(alice.privKeyBytes, encodedtoAlice)
const decodedFromAlice = ecies.decrypt(bob.privKeyBytes, encodedtoBob)

console.log('decodedFromBob ', decodedFromBob.toString())
console.log('decodedFromAlice ', decodedFromAlice.toString())
