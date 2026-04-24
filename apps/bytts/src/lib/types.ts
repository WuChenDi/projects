export interface APIConfig {
  [key: string]: { url: string };
}

export interface SpeakerConfig {
  [key: string]: { speakers: Record<string, string> };
}
