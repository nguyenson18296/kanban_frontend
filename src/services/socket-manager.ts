import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { z } from 'zod/v4'
import { WS_URL } from '@/config/env'
import { decodeJwt } from '@/lib/jwt'
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
// board:join replies echo the projectId back; on a malformed request it is null (contract §5).
const boardJoinSuccessSchema = z.object({ projectId: z.string() })
const boardJoinErrorSchema = z.object({ projectId: z.string().nullable(), message: z.string() })
// presence:update crosses the same untrusted boundary (contract §4).
const presenceUpdateSchema = z.object({
  userId: z.string(),
  isOnline: z.boolean(),
  connectionCount: z.number(),
  timestamp: z.string(),
})

export type WsNotification = z.infer<typeof wsNotificationSchema>

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export type BoardRoomStatus = 'joining' | 'joined' | 'denied'

// Reconnects must not burn a refresh-token rotation while the current access
// token is still valid (JAV-28) — refresh only inside this expiry margin.
const TOKEN_EXPIRY_MARGIN_S = 60

/** True when the token can't be trusted for a reconnect: undecodable or expiring within the margin. */
function needsRefresh(token: string): boolean {
  try {
    const { exp } = decodeJwt(token)
    if (!exp) return false // no expiry claim — a refresh wouldn't improve anything
    return exp - Math.floor(Date.now() / 1000) < TOKEN_EXPIRY_MARGIN_S
  } catch {
    return true // undecodable — let the refresh flow replace it
  }
}

interface SocketManagerOptions {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<string | null>
  onNotification: (notification: WsNotification) => void
  onStatusChange: (status: ConnectionStatus) => void
  // Fires on every server-authenticated connect AND every reconnect —
  // use this to re-fetch the presence snapshot per contract §6.
  onConnect?: () => void
  onPresenceUpdate?: (update: IPresenceUpdate) => void
  // Board room lifecycle (JAV-32): fired for the room requested via joinBoardRoom.
  onBoardRoomStatus?: (projectId: string, status: BoardRoomStatus) => void
}

export class SocketManager {
  private socket: Socket | null = null
  private options: SocketManagerOptions
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  // The single board room this client wants to be in (one board is open at a time).
  private boardProjectId: string | null = null
  // connection:error grants exactly one refresh-and-retry until the next successful connect.
  private authRetryUsed = false

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
      this.authRetryUsed = false
      this.scheduleTokenRefresh()
      console.debug(`[WS] Connected as user ${parsed.success ? parsed.data.userId : 'unknown'}`)
      // A reconnect is a new session: all rooms are lost server-side (§1) — re-join.
      this.emitBoardJoin()
      this.options.onConnect?.()
    })

    this.socket.on('connection:error', async (raw: unknown) => {
      const parsed = messageSchema.safeParse(raw)
      this.options.onStatusChange('error')
      console.error(`[WS] Connection error: ${parsed.success ? parsed.data.message : 'unknown'}`)
      // Contract §1: disconnect first — otherwise the automatic reconnect turns a
      // bad token into a reconnect loop. Then try one refresh and reconnect once.
      this.socket?.disconnect()
      await this.retryWithFreshToken()
    })

    this.socket.on('notification:new', (raw: unknown) => {
      const parsed = wsNotificationSchema.safeParse(raw)
      if (!parsed.success) {
        console.warn('[WS] Dropped malformed notification:new payload', parsed.error)
        return
      }
      this.options.onNotification(parsed.data)
    })

    this.socket.on('presence:update', (raw: unknown) => {
      const parsed = presenceUpdateSchema.safeParse(raw)
      if (!parsed.success) return
      this.options.onPresenceUpdate?.(parsed.data)
    })

    this.socket.on('board:join:success', (raw: unknown) => {
      const parsed = boardJoinSuccessSchema.safeParse(raw)
      if (!parsed.success || parsed.data.projectId !== this.boardProjectId) return
      this.options.onBoardRoomStatus?.(parsed.data.projectId, 'joined')
    })

    this.socket.on('board:join:error', (raw: unknown) => {
      const parsed = boardJoinErrorSchema.safeParse(raw)
      // The server echoes the projectId only for a well-formed request (§5); a
      // null or mismatched id can't belong to the room we asked for — drop it.
      if (!parsed.success || !parsed.data.projectId) return
      if (parsed.data.projectId !== this.boardProjectId) return
      // Deliberately no retry here: §5 forbids retry loops. The next attempt
      // happens naturally on the next connection:established.
      this.options.onBoardRoomStatus?.(parsed.data.projectId, 'denied')
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

    // Reconnect lifecycle lives on the Manager (`socket.io`), not the Socket —
    // since socket.io-client v3 the Socket no longer forwards those events, and
    // connection:established already re-runs status/refresh/re-join/onConnect
    // on every authenticated (re)connect.
    // Update the auth token before each reconnect attempt. Reuse the current
    // access token while it's valid — refreshing unconditionally here fired one
    // POST /auth/refresh per retry whenever the WS server was down (JAV-28).
    this.socket.io.on('reconnect_attempt', async () => {
      this.options.onStatusChange('connecting')
      try {
        const current = this.options.getAccessToken()
        if (current && !needsRefresh(current)) {
          if (this.socket) this.socket.auth = { token: current }
          return
        }
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
   * Subscribe to a project's live board updates (contract §5). Safe to call
   * before the socket is connected — the join is (re-)sent on every
   * connection:established, because a reconnect is a new session with no rooms.
   */
  joinBoardRoom(projectId: string): void {
    this.boardProjectId = projectId
    this.emitBoardJoin()
  }

  /** Unsubscribe when the board view unmounts or the user switches project. */
  leaveBoardRoom(projectId: string): void {
    if (this.boardProjectId !== projectId) return
    this.boardProjectId = null
    // While disconnected there is nothing to leave — the server forgot the room.
    if (this.socket?.connected) {
      this.socket.emit('board:leave', { projectId })
    }
  }

  private emitBoardJoin(): void {
    if (!this.socket?.connected || !this.boardProjectId) return
    this.options.onBoardRoomStatus?.(this.boardProjectId, 'joining')
    this.socket.emit('board:join', { projectId: this.boardProjectId })
  }

  /** One refresh-and-reconnect per auth failure; a second failure stays down. */
  private async retryWithFreshToken(): Promise<void> {
    if (this.authRetryUsed) return
    this.authRetryUsed = true
    try {
      const token = await this.options.refreshAccessToken()
      if (this.socket && token) {
        this.socket.auth = { token }
        this.socket.connect()
      }
    } catch {
      console.error('[WS] Token refresh after auth failure failed; staying disconnected')
    }
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
