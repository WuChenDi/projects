import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import * as jose from 'jose'
import type { CloudflareEnv, Variables } from '@/types'

async function jwtVerifyFn(jwtPubkey: string, token: string) {
  logger.debug('Starting JWT verification process')

  try {
    const publicKey = new Uint8Array(
      jwtPubkey.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ||
        [],
    )

    logger.debug(`Public key extracted, length: ${publicKey.length} bytes`)

    const alg = {
      cur: 'prime256v1',
      crv: 'P-256',
      jwt: 'ES256',
      kty: 'EC',
    }

    const jwk = {
      kty: alg.kty,
      crv: alg.crv,
      alg: alg.jwt,
      x: jose.base64url.encode(publicKey.subarray(1, 33)),
      y: jose.base64url.encode(publicKey.subarray(33)),
    }

    logger.debug('JWK constructed for verification')

    const pubKey = await jose.importJWK(jwk)
    logger.debug('Public key imported successfully')

    const result = await jose.jwtVerify(token, pubKey)
    logger.debug('JWT verification completed successfully')

    return result
  } catch (error) {
    logger.error(
      `JWT verification function failed, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )
    throw error
  }
}

export const jwtMiddleware: MiddlewareHandler<{
  Bindings: CloudflareEnv
  Variables: Variables
}> = async (c, next) => {
  logger.debug('JWT middleware invoked')

  const jwtPubkey = c.env.JWT_PUBKEY

  if (!jwtPubkey) {
    logger.error('JWT public key not found in environment')
    throw new HTTPException(500, { message: 'JWT public key not found' })
  }

  logger.debug('JWT public key found in environment')

  const authorizationHeader = c.req.header('authorization')

  if (!authorizationHeader) {
    logger.warn('Authorization header missing in request')
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    logger.warn('Authorization header does not start with Bearer')
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  logger.debug('Authorization header validation passed')

  try {
    const token = authorizationHeader.substring(7)
    logger.debug(`Extracted JWT token, length: ${token.length} characters`)

    const verify = await jwtVerifyFn(jwtPubkey, token)

    logger.info('JWT verification succeeded')
    logger.debug(
      `JWT payload extracted: ${JSON.stringify({
        sub: verify.payload.sub,
        iat: verify.payload.iat,
        exp: verify.payload.exp,
      })}`,
    )

    c.set('auth', verify.payload)
    await next()
  } catch (error) {
    logger.error(
      `JWT verification failed, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )
    throw new HTTPException(401, { message: 'Invalid token' })
  }
}
