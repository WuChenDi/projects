export type CompressionMethod = 'quality' | 'bitrate' | 'filesize'
export type VideoQuality = 'low' | 'medium' | 'high' | 'very_high'

export interface ConversionSettings {
  compressionMethod: CompressionMethod
  quality: VideoQuality
  videoBitrate: string
  targetFilesize?: string
  videoCodec: 'avc' | 'hevc'
  audioBitrate: string
  frameRate: string
  resolution: string
}

export const defaultSettings: ConversionSettings = {
  compressionMethod: 'quality',
  quality: 'medium',
  videoBitrate: '2500k',
  videoCodec: 'avc',
  audioBitrate: '128k',
  frameRate: 'original',
  resolution: 'original',
}
