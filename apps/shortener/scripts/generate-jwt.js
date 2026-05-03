import * as jose from 'jose'

async function generateKeyPair() {
  try {
    // Generate ES256 key pair, set as extractable
    const { publicKey, privateKey } = await jose.generateKeyPair('ES256', {
      extractable: true, // Set as extractable
    })

    // Export public and private keys
    const publicJWK = await jose.exportJWK(publicKey)
    const privateJWK = await jose.exportJWK(privateKey)

    console.log('🔑 Generated key pair:')
    console.log('\n📋 Public key (JWK):')
    console.log(JSON.stringify(publicJWK, null, 2))

    console.log('\n🔐 Private key (JWK):')
    console.log(JSON.stringify(privateJWK, null, 2))

    // Generate test JWT
    const payload = {
      sub: 'shortener-admin-wudi',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // Expires in 24 hours
      userId: 'wudi',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
    }

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256' })
      .sign(privateKey)

    console.log('\n🎫 Generated test JWT:')
    console.log(jwt)

    // Verify JWT
    console.log('\n✅ JWT verification test:')
    const { payload: verifiedPayload } = await jose.jwtVerify(jwt, publicKey)
    console.log('Verification successful! Payload:', verifiedPayload)

    // Convert public key to hex format required by the project
    console.log(
      '\n🔄 Converting public key to hex format required by the project...',
    )

    // Export raw public key bytes
    const rawPublicKey = await jose.exportSPKI(publicKey)
    console.log('\n📋 Public key (SPKI format):')
    console.log(rawPublicKey)

    // Reconstruct hex format for the project
    // Note: This requires reconstructing from JWK's x and y coordinates
    const xBytes = jose.base64url.decode(publicJWK.x)
    const yBytes = jose.base64url.decode(publicJWK.y)

    // EC uncompressed point format: 0x04 + x + y
    const uncompressedPoint = new Uint8Array(1 + xBytes.length + yBytes.length)
    uncompressedPoint[0] = 0x04 // Uncompressed point indicator
    uncompressedPoint.set(xBytes, 1)
    uncompressedPoint.set(yBytes, 1 + xBytes.length)

    const hexPublicKey = Array.from(uncompressedPoint)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

    console.log('\n🎯 JWT_PUBKEY for wrangler.jsonc:')
    console.log(hexPublicKey)

    console.log('\n📝 Usage steps:')
    console.log(
      '1. Copy the hex public key above to JWT_PUBKEY in wrangler.jsonc',
    )
    console.log('2. Copy the generated JWT token for API testing')
    console.log('3. Add to request header: Authorization: Bearer <jwt-token>')
  } catch (error) {
    console.error('Error generating key pair:', error)
  }
}

void generateKeyPair()
