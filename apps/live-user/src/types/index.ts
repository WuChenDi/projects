export interface AppEnv {
  SITE_MANAGER: DurableObjectNamespace
}

export interface ConnectionState {
  clientId: string
  siteId: string
  enableTotalCount: boolean
  joinedAt: number
}

export interface SDKConfig {
  serverUrl: string
  siteId: string
  displayElementId: string
  totalCountElementId: string
  reconnectDelay: number
  debug: boolean
  enableTotalCount: boolean
}
