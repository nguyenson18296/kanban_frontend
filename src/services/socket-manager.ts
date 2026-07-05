import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { z } from 'zod/v4'
import { WS_URL } from '../config/env'
import { NotificationType } from '@/types/notification.type'
import type { IPresenceUpdate } from '@/types'

// Incoming socket payloads cross an untrusted boundary — validate the envelope
// (not the free-form `payload` contents) before handing it to the app.
const wsNotificationSchema = z.object({
  // Derived from the single source of truth (NotificationType) so it can't drift.
  type: z.enum(NotificationType),
  actorId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
})

const userIdSchema = z.object({ userId: z.string() })
const messageSchema = z.object({ message: z.string() })

export type WsNotification = z.infer<typeof wsNotificationSchema>

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface SocketManagerOptions {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<string | null>
  onNotification: (notification: WsNotification) => void
  onStatusChange: (status: ConnectionStatus) => void
  // Fires on every server-authenticated connect AND every reconnect —
  // use this to re-fetch the presence snapshot per contract §6.
  onConnect?: () => void
  onPresenceUpdate?: (update: IPresenceUpdate) => void
}

export class SocketManager {
  private socket: Socket | null = null
  private options: SocketManagerOptions
  private refreshTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: SocketManagerOptions) {
    this.options = options
  }

  connect(): void {
    const token = this.options.getAccessToken()
    if (!token) return

    this.disconnect()
    this.options.onStatusChange('connecting')

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    })

    this.registerListeners()
  }

  disconnect(): void {
    this.clearRefreshTimer()
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
    this.options.onStatusChange('disconnected')
  }

  private registerListeners(): void {
    if (!this.socket) return

    this.socket.on('connection:established', (raw: unknown) => {
      const parsed = userIdSchema.safeParse(raw)
      this.options.onStatusChange('connected')
      this.scheduleTokenRefresh()
      console.debug(`[WS] Connected as user ${parsed.success ? parsed.data.userId : 'unknown'}`)
      this.options.onConnect?.()
    })

    this.socket.on('connection:error', (raw: unknown) => {
      const parsed = messageSchema.safeParse(raw)
      this.options.onStatusChange('error')
      console.error(`[WS] Connection error: ${parsed.success ? parsed.data.message : 'unknown'}`)
    })

    this.socket.on('notification:new', (raw: unknown) => {
      const parsed = wsNotificationSchema.safeParse(raw)
      if (!parsed.success) {
        console.warn('[WS] Dropped malformed notification:new payload', parsed.error)
        return
      }
      this.options.onNotification(parsed.data)
    })

    this.socket.on('presence:update', (update: IPresenceUpdate) => {
      this.options.onPresenceUpdate?.(update)
    })

    this.socket.on('token:refresh:success', () => {
      this.scheduleTokenRefresh()
      console.debug('[WS] Token refreshed')
    })

    this.socket.on('token:refresh:error', (raw: unknown) => {
      const parsed = messageSchema.safeParse(raw)
      console.error(`[WS] Token refresh failed: ${parsed.success ? parsed.data.message : 'unknown'}`)
    })

    this.socket.on('disconnect', (reason: string) => {
      this.options.onStatusChange('disconnected')
      this.clearRefreshTimer()
      console.debug(`[WS] Disconnected: ${reason}`)
    })

    this.socket.on('reconnect_attempt', (attempt: number) => {
      this.options.onStatusChange('connecting')
      console.debug(`[WS] Reconnect attempt ${attempt}`)
    })

    this.socket.on('reconnect', () => {
      this.options.onStatusChange('connected')
      this.scheduleTokenRefresh()
      this.options.onConnect?.()
    })

    // Update auth token before each reconnect attempt
    this.socket.io.on('reconnect_attempt', async () => {
      try {
        const newToken = await this.options.refreshAccessToken()
        if (this.socket && newToken) {
          this.socket.auth = { token: newToken }
        }
      } catch {
        console.error('[WS] Failed to refresh token for reconnect')
      }
    })
  }

  /**
   * Schedule a token refresh before the JWT expires.
   * Default JWT expiry is 1h; refresh at 50 minutes to leave margin.
   */
  private scheduleTokenRefresh(): void {
    this.clearRefreshTimer()

    const REFRESH_INTERVAL_MS = 50 * 60 * 1000

    this.refreshTimer = setTimeout(async () => {
      try {
        const newToken = await this.options.refreshAccessToken()
        if (newToken) {
          this.socket?.emit('token:refresh', { token: newToken })
        }
      } catch {
        console.error('[WS] Scheduled token refresh failed')
      }
    }, REFRESH_INTERVAL_MS)
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}
