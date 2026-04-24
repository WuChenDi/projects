import { NextResponse } from 'next/server'

interface Voice {
  ShortName: string;
  LocalName: string;
  Locale: string;
  Gender: string;
  WordsPerMinute?: string;
  SampleRateHertz?: string;
}

async function voiceList(): Promise<Voice[]> {
  const response = await fetch('https://eastus.api.speech.microsoft.com/cognitiveservices/voices/list', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'X-Ms-Useragent': 'SpeechStudio/2021.05.001',
      'Content-Type': 'application/json',
      'Origin': 'https://azure.microsoft.com',
      'Referer': 'https://azure.microsoft.com'
    }
  })
  if (!response.ok) throw new Error(`Failed to fetch voices: ${response.status}`)
  return response.json()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const localeFilter = searchParams.get('l')?.toLowerCase() || ''
  const format = searchParams.get('f')

  try {
    let voices = await voiceList()
    if (localeFilter) {
      voices = voices.filter((item) => item.Locale.toLowerCase().includes(localeFilter))
    }

    if (format === '0') {
      const formattedVoices = voices.map(
        (item) => `
- !!org.nobody.multitts.tts.speaker.Speaker
  avatar: ''
  code: ${item.ShortName}
  desc: ''
  extendUI: ''
  gender: ${item.Gender === 'Female' ? '0' : '1'}
  name: ${item.LocalName}
  note: 'wpm: ${item.WordsPerMinute || ''}'
  param: ''
  sampleRate: ${item.SampleRateHertz || '24000'}
  speed: 1.5
  type: 1
  volume: 1`
      )
      return new NextResponse(formattedVoices.join('\n'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      })
    } else if (format === '1') {
      const voiceMap = Object.fromEntries(voices.map((item) => [item.ShortName, item.LocalName]))
      return NextResponse.json(voiceMap, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } else {
      return NextResponse.json(voices, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-auth-token'
    }
  })
}

export const runtime = 'edge'
