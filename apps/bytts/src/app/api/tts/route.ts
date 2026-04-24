// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech?tabs=streaming

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

let expiredAt: number | null = null
let endpoint: any = null
let clientId = process.env.MICROSOFT_CLIENTTRACEID || ''

function makeCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // Adjust as needed
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS', // Ensure all required methods are listed
    'Access-Control-Allow-Headers': 'Content-Type, x-auth-token', // Ensure all required headers are listed
    'Access-Control-Max-Age': '86400',
  }
}

function generateSsml(
  text: string,
  voiceName: string,
  rate: number,
  pitch: number,
) {
  return `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="zh-CN">
              <voice name="${voiceName}">
                  <mstts:express-as style="general" styledegree="1.0" role="default">
                      <prosody rate="${rate}%" pitch="${pitch}%" volume="50">${text}</prosody>
                  </mstts:express-as>
              </voice>
          </speak>`
}

async function refreshEndpoint() {
  // Moved internal state (expiredAt, endpoint, clientId) outside the function scope
  if (!expiredAt || Date.now() / 1000 > expiredAt - 60) {
    try {
      endpoint = await getEndpoint()

      // Parse JWT token to get expiry time
      const parts = endpoint.t.split('.')
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        // Node.js Buffer might be more appropriate in Next.js server environment
        // const jsonPayload = Buffer.from(base64, 'base64').toString();
        const jsonPayload = decodeURIComponent(
          // Keep existing decode logic if not using Buffer
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''),
        )

        const decodedJwt = JSON.parse(jsonPayload)
        expiredAt = decodedJwt.exp
      } else {
        // Default expiry if we can't parse the token
        expiredAt = Date.now() / 1000 + 3600
      }

      // Use Web Crypto API which is available in Next.js server environment
      clientId = crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).substring(2, 15)
      console.log(
        `获取 Endpoint, 过期时间剩余: ${((expiredAt! - Date.now() / 1000) / 60).toFixed(2)} 分钟`,
      )
    } catch (error) {
      console.error('无法获取或解析Endpoint:', error)
      throw error
    }
  } else {
    console.log(
      `过期时间剩余: ${((expiredAt! - Date.now() / 1000) / 60).toFixed(2)} 分钟`,
    )
  }
}

async function getEndpoint() {
  const endpointUrl =
    'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0'
  const headers = {
    'Accept-Language': 'zh-Hans',
    'X-ClientVersion': '4.0.530a 5fe1dc6c',
    // In Next.js Server Components/API routes, there's no direct user session for X-UserId
    // You might need a different strategy for user identification if required by the upstream API
    'X-UserId': '0f04d16a175c411e', // Placeholder - consider if this needs to be dynamic
    'X-HomeGeographicRegion': 'zh-Hans-CN',
    'X-ClientTraceId': clientId,
    'X-MT-Signature': await generateSignature(endpointUrl),
    'User-Agent': 'okhttp/4.5.0', // Spoofing user agent might be necessary
    'Content-Type': 'application/json; charset=utf-8',
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: headers,
  })

  if (!response.ok) {
    throw new Error(`获取 Endpoint 失败，状态码 ${response.status}`)
  }

  return await response.json()
}

async function generateSignature(urlStr: string): Promise<string> {
  try {
    const url = urlStr.split('://')[1]
    const encodedUrl = encodeURIComponent(url)
    // Use Web Crypto API
    const uuidStr = crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).substring(2, 15)
    const formattedDate = formatDate()
    const bytesToSign =
      `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase()

    // Import the key for signing
    const keyData = base64ToUint8Array(
      'oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==',
    )

    // Use Web Crypto API
    const key = await crypto.subtle.importKey(
      'raw',
      // @ts-expect-error
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign'],
    )

    // Sign the data
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(bytesToSign),
    )

    // Convert the signature to base64
    const signatureBase64 = arrayBufferToBase64(signature)

    return `MSTranslatorAndroidApp::${signatureBase64}::${formattedDate}::${uuidStr}`
  } catch (error) {
    console.error('Generate signature error:', error)
    throw error
  }
}

function formatDate() {
  const date = new Date()
  const utcString = date.toUTCString().replace(/GMT/, '').trim() + ' GMT'
  return utcString.toLowerCase()
}

/**
 * Convert a base64 string to an ArrayBuffer.
 * @param base64
 * @returns
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary_string = atob(base64)
  const bytes = new Uint8Array(binary_string.length)
  for (let i = 0; i < binary_string.length; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes
}

/**
 * Convert an ArrayBuffer to a base64 string.
 * @param buffer
 * @returns
 */
function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function handleTTS(
  text: string,
  voiceName: string,
  rate: number,
  pitch: number,
  outputFormat: string,
  download: boolean,
) {
  try {
    await refreshEndpoint()

    if (!endpoint) {
      throw new Error('Endpoint is not available.')
    }

    // Generate SSML
    const ssml = generateSsml(text, voiceName, rate, pitch)

    // Get URL from endpoint
    const url = `https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`

    // Set up headers
    const headers = {
      Authorization: endpoint.t,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': outputFormat,
      'User-Agent': 'okhttp/4.5.0', // Spoofing user agent
      Origin: 'https://azure.microsoft.com',
      Referer: 'https://azure.microsoft.com/',
    }

    // Make the request to Microsoft's TTS service
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: ssml,
    })

    // Handle errors
    if (!response.ok) {
      let errorDetail = ''
      try {
        // Attempt to read error response body if available
        errorDetail = await response.text()
      } catch (error) {
        console.error('Failed to read error response body:', error)
        errorDetail = 'No error details available from upstream.'
      }
      throw new Error(
        `TTS 请求失败，状态码 ${response.status}. 详情: ${errorDetail}`,
      )
    }

    // Create a new response with the appropriate headers
    const responseHeaders = new Headers({
      // 'Content-Type': 'audio/mpeg', // Adjust based on outputFormat if needed
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
      ...makeCORSHeaders(),
    })

    if (download) {
      // Adjust filename extension based on outputFormat
      const fileExtension = outputFormat.split('-').pop() || 'mp3' // e.g., "audio-24khz-48kbitrate-mono-mp3" -> "mp3"
      responseHeaders.set(
        'Content-Disposition',
        `attachment; filename="${voiceName}.${fileExtension}"`,
      )
    }

    const audioData = await response.arrayBuffer()
    return new NextResponse(audioData, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('TTS Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = body.text || ''
    const voiceName = body.voice || 'zh-CN-XiaoxiaoMultilingualNeural'
    const rate = Number(body.rate) || 0
    const pitch = Number(body.pitch) || 0
    const outputFormat =
      body.format || body.outputFormat || 'audio-24khz-48kbitrate-mono-mp3'
    const download = body.preview === false

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    if (!voiceName) {
      return NextResponse.json({ error: 'Voice is required' }, { status: 400 })
    }

    return await handleTTS(text, voiceName, rate, pitch, outputFormat, download)
  } catch (error) {
    console.error('POST /api/tts Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const text = searchParams.get('t') || ''
    const voiceName =
      searchParams.get('v') || 'zh-CN-XiaoxiaoMultilingualNeural'
    const rate = Number(searchParams.get('r')) || 0
    const pitch = Number(searchParams.get('p')) || 0
    const outputFormat =
      searchParams.get('o') || 'audio-24khz-48kbitrate-mono-mp3' // Default format
    const download = searchParams.get('d') === 'true' // Check for 'd=true'

    if (!text) {
      return NextResponse.json(
        { error: 'Text (t) is required' },
        { status: 400 },
      )
    }
    if (!voiceName) {
      return NextResponse.json(
        { error: 'Voice (v) is required' },
        { status: 400 },
      )
    }

    return await handleTTS(text, voiceName, rate, pitch, outputFormat, download)
  } catch (error) {
    console.error('GET /api/tts Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 },
    )
  }
}

// export async function OPTIONS() {
//   return NextResponse.json({}, { status: 204 })
// }

export const runtime = 'edge'
