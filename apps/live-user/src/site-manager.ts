import { DurableObject } from 'cloudflare:workers'
import type { ConnectionState } from '@/types'

export class SiteManager extends DurableObject<Record<string, unknown>> {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS visit_counter (
          site_id TEXT PRIMARY KEY,
          count INTEGER NOT NULL DEFAULT 0
        );
      `)
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname !== '/ws') {
      return new Response('Not found', { status: 404 })
    }

    const clientId = url.searchParams.get('clientId') || crypto.randomUUID()
    const siteId = url.searchParams.get('siteId') || 'default-site'
    const enableTotalCount = url.searchParams.get('enableTotalCount') === 'true'

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)

    const state: ConnectionState = {
      clientId,
      siteId,
      enableTotalCount,
      joinedAt: Date.now(),
    }
    server.serializeAttachment(state)

    if (enableTotalCount) {
      this.incrementTotalCount(siteId)
    }

    this.broadcast(siteId)

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return

    try {
      const msg = JSON.parse(message)
      const state = ws.deserializeAttachment() as ConnectionState

      if (msg.type === 'heartbeat') {
        const response: Record<string, unknown> = {
          type: 'heartbeat',
          count: this.getOnlineCount(),
          timestamp: Math.floor(Date.now() / 1000),
        }
        if (state.enableTotalCount) {
          response.totalCount = this.getTotalCount(state.siteId)
        }
        ws.send(JSON.stringify(response))
      } else if (msg.type === 'join') {
        this.broadcast(state.siteId)
      }
    } catch {
      // ignore malformed messages
    }
  }

  // Bug fix: Hibernation API calls this AFTER socket is already closed
  // Do NOT call ws.close() here — it's redundant and can throw
  async webSocketClose(
    _ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ) {
    const state = _ws.deserializeAttachment() as ConnectionState
    this.broadcast(state.siteId)
  }

  // Bug fix: broadcast after error so other clients get updated count
  async webSocketError(ws: WebSocket, _error: unknown) {
    const state = ws.deserializeAttachment() as ConnectionState
    ws.close(1011, 'WebSocket error')
    this.broadcast(state.siteId)
  }

  private getOnlineCount(): number {
    return this.ctx.getWebSockets().length
  }

  private getTotalCount(siteId: string): number {
    const row = this.ctx.storage.sql
      .exec<{ count: number }>(
        'SELECT count FROM visit_counter WHERE site_id = ?',
        siteId,
      )
      .toArray()
    return row.length > 0 ? row[0].count : 0
  }

  private incrementTotalCount(siteId: string): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO visit_counter (site_id, count) VALUES (?, 1)
       ON CONFLICT(site_id) DO UPDATE SET count = count + 1`,
      siteId,
    )
  }

  // Bug fix: respect each client's own enableTotalCount preference
  // instead of using the triggering connection's flag
  private broadcast(siteId: string): void {
    const count = this.getOnlineCount()
    const totalCount = this.getTotalCount(siteId)

    for (const client of this.ctx.getWebSockets()) {
      try {
        const state = client.deserializeAttachment() as ConnectionState
        const data: Record<string, unknown> = { type: 'update', count }
        if (state.enableTotalCount) {
          data.totalCount = totalCount
        }
        client.send(JSON.stringify(data))
      } catch {
        // client already disconnected
      }
    }
  }
}
