export const BUILTIN_APIS = {
  'edge-api': {
    label: 'Edge API',
    enabled: true,
    format: 'edge' as const,
    endpoint: '/api/tts',
    speakers: {} as Record<string, string>,
    maxLength: 50000,
    splitLength: 5000,
  },
  'oai-tts': {
    label: 'OAI-TTS',
    enabled: true,
    format: 'openai' as const,
    endpoint: 'https://oai-tts.zwei.de.eu.org/v1/audio/speech',
    speakers: {
      alloy: 'Alloy',
      ash: 'Ash',
      coral: 'Coral',
      echo: 'Echo',
      fable: 'Fable',
      onyx: 'Onyx',
      nova: 'Nova',
      sage: 'Sage',
      shimmer: 'Shimmer',
    },
    maxLength: 4096,
    splitLength: 4096,
  },
} as const

export type BuiltinApiId = keyof typeof BUILTIN_APIS

export function isBuiltinId(id: string): id is BuiltinApiId {
  return id in BUILTIN_APIS
}
