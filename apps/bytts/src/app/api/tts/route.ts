// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech?tabs=streaming

import { randomUUID, subtle } from '@cdlab/uncrypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { escapeXml } from '@/lib/utils'

export const runtime = 'edge'

let expiredAt: number | null = null
let endpoint: { t: string; r: string } | null = null
let clientId = process.env.MICROSOFT_CLIENTTRACEID || ''
let refreshInFlight: Promise<void> | null = null

const VOICE_NAME_RE = /^[a-zA-Z0-9\-_]+$/

function generateSsml(
  text: string,
  voiceName: string,
  rate: number,
  pitch: number,
) {
  // Escape user text on the server so direct API callers cannot inject SSML;
  // escapeXml preserves legitimate <break time="..."/> pause tags.
  const escapedText = escapeXml(text)
  return `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="zh-CN">
    <voice name="${voiceName}">
      <mstts:express-as style="general" styledegree="1.0" role="default">
        <prosody rate="${rate}%" pitch="${pitch}%" volume="50">${escapedText}</prosody>
      </mstts:express-as>
    </voice>
  </speak>`
}

async function refreshEndpoint() {
  if (expiredAt && Date.now() / 1000 <= expiredAt - 60) return

  // De-dupe concurrent refreshes in the same isolate: share one in-flight
  // promise so only a single endpoint fetch runs at a time.
  if (refreshInFlight !== null) return await refreshInFlight

  refreshInFlight = (async () => {
    const ep = await getEndpoint()
    endpoint = ep

    const parts = ep.t.split('.')
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join(''),
      )
      expiredAt = JSON.parse(jsonPayload).exp
    } else {
      expiredAt = Date.now() / 1000 + 3600
    }

    clientId = randomUUID().replace(/-/g, '')
  })().finally(() => {
    refreshInFlight = null
  })

  return await refreshInFlight
}

async function getEndpoint() {
  const endpointUrl =
    'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0'

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Accept-Language': 'zh-Hans',
      'X-ClientVersion': '4.0.530a 5fe1dc6c',
      'X-UserId': '0f04d16a175c411e',
      'X-HomeGeographicRegion': 'zh-Hans-CN',
      'X-ClientTraceId': clientId,
      'X-MT-Signature': await generateSignature(endpointUrl),
      'User-Agent': 'okhttp/4.5.0',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get endpoint: ${response.status}`)
  }

  return response.json()
}

async function generateSignature(urlStr: string): Promise<string> {
  const url = urlStr.split('://')[1]
  const encodedUrl = encodeURIComponent(url)
  const uuidStr = randomUUID().replace(/-/g, '')
  const formattedDate = new Date()
    .toUTCString()
    .replace(/GMT/, '')
    .trim()
    .concat(' GMT')
    .toLowerCase()
  const bytesToSign =
    `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase()

  const keyData = Uint8Array.from(
    atob(
      'oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==',
    ),
    (c) => c.charCodeAt(0),
  )

  const key = await subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign'],
  )

  const signature = await subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(bytesToSign),
  )

  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )

  return `MSTranslatorAndroidApp::${signatureBase64}::${formattedDate}::${uuidStr}`
}

async function handleTTS(
  text: string,
  voiceName: string,
  rate: number,
  pitch: number,
  outputFormat: string,
  download: boolean,
) {
  await refreshEndpoint()

  if (!endpoint) {
    throw new Error('Endpoint is not available.')
  }

  const ssml = generateSsml(text, voiceName, rate, pitch)
  const url = `https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: endpoint.t,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': outputFormat,
      'User-Agent': 'okhttp/4.5.0',
      Origin: 'https://azure.microsoft.com',
      Referer: 'https://azure.microsoft.com/',
    },
    body: ssml,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`TTS request failed: ${response.status}. ${detail}`)
  }

  const audioData = await response.arrayBuffer()
  const headers = new Headers({
    'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
  })

  if (download) {
    const ext = outputFormat.split('-').pop() || 'mp3'
    headers.set(
      'Content-Disposition',
      `attachment; filename="${voiceName}.${ext}"`,
    )
  }

  return new NextResponse(audioData, { status: 200, headers })
}

function parseParams(params: {
  text: string
  voice?: string
  rate?: string | number
  pitch?: string | number
  format?: string
  outputFormat?: string
  preview?: boolean | string
}) {
  const text = params.text || ''
  const voice = params.voice || 'zh-CN-XiaoxiaoMultilingualNeural'
  const rate = Number(params.rate) || 0
  const pitch = Number(params.pitch) || 0
  const format =
    params.format || params.outputFormat || 'audio-24khz-48kbitrate-mono-mp3'
  const download = params.preview === false || params.preview === 'false'

  if (!text) {
    return {
      error: 'Text is required',
    }
  }
  if (!VOICE_NAME_RE.test(voice)) {
    return {
      error: 'Invalid voice name',
    }
  }

  return { text, voice, rate, pitch, format, download }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params = parseParams(body)

    if ('error' in params) {
      return NextResponse.json({ error: params.error }, { status: 400 })
    }

    return await handleTTS(
      params.text,
      params.voice,
      params.rate,
      params.pitch,
      params.format,
      params.download,
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 },
    )
  }
}
