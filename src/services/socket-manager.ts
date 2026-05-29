import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { WS_URL } from '../config/env'
import type { NotificationType } from '@/types/notification.type'

export interface WsNotification {
  type: NotificationType
  actorId: string
  entityType: string
  entityId: string
  payload: Record<string, unknown>
  createdAt: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface SocketManagerOptions {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<string | null>
  onNotification: (notification: WsNotification) => void
  onStatusChange: (status: ConnectionStatus) => void
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

    this.socket.on('connection:established', ({ userId }: { userId: string }) => {
      this.options.onStatusChange('connected')
      this.scheduleTokenRefresh()
      console.debug(`[WS] Connected as user ${userId}`)
    })

    this.socket.on('connection:error', ({ message }: { message: string }) => {
      this.options.onStatusChange('error')
      console.error(`[WS] Connection error: ${message}`)
    })

    this.socket.on('notification:new', (notification: WsNotification) => {
      this.options.onNotification(notification)
    })

    this.socket.on('token:refresh:success', () => {
      this.scheduleTokenRefresh()
      console.debug('[WS] Token refreshed')
    })

    this.socket.on('token:refresh:error', ({ message }: { message: string }) => {
      console.error(`[WS] Token refresh failed: ${message}`)
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
