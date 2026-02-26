export interface ConversionSettings {
  compressionMethod: 'bitrate' | 'percentage' | 'filesize' | 'crf'
  targetPercentage?: string
  targetFilesize?: string
  crfValue?: string
  videoBitrate: string
  videoCodec: string
  audioCodec: string
  audioBitrate: string
  frameRate: string
  resolution: string
}

export const defaultSettings: ConversionSettings = {
  compressionMethod: 'bitrate',
  videoBitrate: '2500k',
  videoCodec: 'libx264',
  audioCodec: 'aac',
  audioBitrate: '128k',
  frameRate: '30',
  resolution: '1920x1080',
}
