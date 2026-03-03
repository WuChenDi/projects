interface VPlayerSource {
  type: string
  src: string
}

interface VPlayerInstance {
  on: (event: string, callback: (event: string, data: unknown) => void) => void
  start: () => void
  stop: () => void
  play: () => void
  toggle: () => void
  seek: (time: number) => void
  restart: (reason: string, extra: unknown) => void
  destroy: () => void
  setSpeed: (rate: number) => void
  switchNextSource: (reason: string, force: boolean) => void
  switchSources: (sources: VPlayerSource[]) => void
  setOnStalledThresholdTriggered: (callback: (state: unknown) => void) => void
  version: () => string
}

interface VPlayer {
  createVzanPlayer: (elementId: string, config: Record<string, unknown>) => VPlayerInstance
  enableDebug: (enabled: boolean) => void
  setEnableBackgroundPlaying: (enabled: boolean) => void
  setTsSegmentCountThreshold: (count: number) => void
  Events: {
    PLAYER_CREATING: string
    PLAYER_CREATED: string
    PLAYER_DESTROYED: string
    PLAYER_WARN: string
    PLAYER_ERROR: string
    PLAYER_STATISTICS: string
    PLAYER_SOURCE_SWITCHED: string
  }
}

declare global {
  interface Window {
    vplayer: VPlayer
  }
}

export type { VPlayer, VPlayerInstance, VPlayerSource }
