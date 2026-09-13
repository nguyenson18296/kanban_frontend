import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SocketManager } from '../socket-manager'

// Capture the listeners SocketManager registers on the socket and its manager
// so tests can fire `reconnect_attempt` by hand — no real socket.io involved.
const { fakeSocket, ioMock } = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const managerHandlers = new Map<string, (...args: unknown[]) => unknown>()
  const fakeSocket = {
    handlers,
    managerHandlers,
    auth: {} as Record<string, unknown>,
    connected: false,
    on: (event: string, cb: (...args: unknown[]) => unknown) => {
      handlers.set(event, cb)
    },
    io: {
      on: (event: string, cb: (...args: unknown[]) => unknown) => {
        managerHandlers.set(event, cb)
      },
    },
    emit: vi.fn(),
    connect: vi.fn(),
    removeAllListeners: () => {
      handlers.clear()
      managerHandlers.clear()
    },
    disconnect: vi.fn(() => {
      fakeSocket.connected = false
    }),
  }
  return { fakeSocket, ioMock: vi.fn(() => fakeSocket) }
})

vi.mock('socket.io-client', () => ({ io: ioMock }))

/** Minimal signed-looking JWT whose `exp` lies `expiresInSeconds` from now. */
function jwtWithExp(expiresInSeconds: number): string {
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'u1', exp })}.signature`
}

let currentManager: SocketManager | null = null

function createManager(overrides: { getAccessToken?: () => string | null } = {}) {
  const options = {
    getAccessToken: vi.fn(overrides.getAccessToken ?? (() => jwtWithExp(3600))),
    refreshAccessToken: vi.fn<() => Promise<string | null>>(async () => 'refreshed-token'),
    onNotification: vi.fn(),
    onStatusChange: vi.fn(),
    onBoardRoomStatus: vi.fn(),
  }
  const manager = new SocketManager(options)
  manager.connect()
  currentManager = manager
  const reconnectAttempt = fakeSocket.managerHandlers.get('reconnect_attempt')
  if (!reconnectAttempt) throw new Error('reconnect_attempt handler was not registered')
  return { manager, options, reconnectAttempt }
}

/** Fire the server-authenticated connect the way socket.io would. */
function establish() {
  fakeSocket.connected = true
  const handler = fakeSocket.handlers.get('connection:established')
  if (!handler) throw new Error('connection:established handler was not registered')
  handler({ userId: 'u1' })
}

function fire(event: string, payload: unknown): unknown {
  const handler = fakeSocket.handlers.get(event)
  if (!handler) throw new Error(`${event} handler was not registered`)
  return handler(payload)
}

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {})
  fakeSocket.handlers.clear()
  fakeSocket.managerHandlers.clear()
  fakeSocket.auth = {}
  fakeSocket.connected = false
  fakeSocket.emit.mockClear()
  fakeSocket.connect.mockClear()
  fakeSocket.disconnect.mockClear()
})

afterEach(() => {
  currentManager?.disconnect()
  currentManager = null
  vi.restoreAllMocks()
})

describe('SocketManager reconnect_attempt', () => {
  it('reuses a still-valid access token without calling refresh', async () => {
    const token = jwtWithExp(3600)
    const { options, reconnectAttempt } = createManager({ getAccessToken: () => token })

    await reconnectAttempt()

    expect(options.refreshAccessToken).not.toHaveBeenCalled()
    expect(fakeSocket.auth).toEqual({ token })
  })

  it('refreshes when the token is inside the expiry margin', async () => {
    const { options, reconnectAttempt } = createManager({ getAccessToken: () => jwtWithExp(10) })

    await reconnectAttempt()

    expect(options.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fakeSocket.auth).toEqual({ token: 'refreshed-token' })
  })

  it('refreshes when the token has gone missing since connect', async () => {
    const getAccessToken = vi
      .fn<() => string | null>()
      .mockReturnValueOnce(jwtWithExp(3600)) // connect()
      .mockReturnValue(null) // reconnect_attempt
    const { options, reconnectAttempt } = createManager({ getAccessToken })

    await reconnectAttempt()

    expect(options.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fakeSocket.auth).toEqual({ token: 'refreshed-token' })
  })

  it('refreshes when the token is undecodable', async () => {
    const { options, reconnectAttempt } = createManager({ getAccessToken: () => 'not-a-jwt' })

    await reconnectAttempt()

    expect(options.refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('swallows a failed refresh and leaves the retry loop intact', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { options, reconnectAttempt } = createManager({ getAccessToken: () => jwtWithExp(10) })
    options.refreshAccessToken.mockRejectedValue(new Error('refresh down'))

    await expect(Promise.resolve(reconnectAttempt())).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith('[WS] Failed to refresh token for reconnect')
    expect(fakeSocket.auth).toEqual({})
  })

  it("reports 'connecting' while a reconnect attempt is underway", async () => {
    const { options, reconnectAttempt } = createManager()

    await reconnectAttempt()

    expect(options.onStatusChange).toHaveBeenCalledWith('connecting')
  })
})

describe('SocketManager board rooms (JAV-32)', () => {
  it('queues board:join until the connection is established', () => {
    const { manager, options } = createManager()

    manager.joinBoardRoom('p1')

    expect(fakeSocket.emit).not.toHaveBeenCalled()

    establish()

    expect(fakeSocket.emit).toHaveBeenCalledWith('board:join', { projectId: 'p1' })
    expect(options.onBoardRoomStatus).toHaveBeenCalledWith('p1', 'joining')
  })

  it('joins immediately when already connected', () => {
    const { manager } = createManager()
    establish()
    fakeSocket.emit.mockClear()

    manager.joinBoardRoom('p1')

    expect(fakeSocket.emit).toHaveBeenCalledWith('board:join', { projectId: 'p1' })
  })

  it('re-joins the room on every reconnect — rooms are lost server-side', () => {
    const { manager } = createManager()
    manager.joinBoardRoom('p1')

    establish()
    establish() // a reconnect is a new session

    const joins = fakeSocket.emit.mock.calls.filter(([event]) => event === 'board:join')
    expect(joins).toEqual([
      ['board:join', { projectId: 'p1' }],
      ['board:join', { projectId: 'p1' }],
    ])
  })

  it("reports 'joined' on board:join:success for the current room", () => {
    const { manager, options } = createManager()
    establish()
    manager.joinBoardRoom('p1')

    fire('board:join:success', { projectId: 'p1' })

    expect(options.onBoardRoomStatus).toHaveBeenLastCalledWith('p1', 'joined')
  })

  it("reports 'denied' on board:join:error for the current room and does not retry", () => {
    const { manager, options } = createManager()
    establish()
    manager.joinBoardRoom('p1')
    fakeSocket.emit.mockClear()

    fire('board:join:error', { projectId: 'p1', message: 'You do not have access to this project' })

    expect(options.onBoardRoomStatus).toHaveBeenLastCalledWith('p1', 'denied')
    expect(fakeSocket.emit).not.toHaveBeenCalled() // denial must not trigger a retry loop
  })

  it('ignores join replies for a different, null, or malformed projectId', () => {
    const { manager, options } = createManager()
    establish()
    manager.joinBoardRoom('p1')
    options.onBoardRoomStatus.mockClear()

    fire('board:join:success', { projectId: 'p2' })
    fire('board:join:error', { projectId: 'p2', message: 'x' })
    fire('board:join:error', { projectId: null, message: 'x' })
    fire('board:join:success', 'junk')

    expect(options.onBoardRoomStatus).not.toHaveBeenCalled()
  })

  it('leaveBoardRoom emits board:leave and stops re-joining on reconnect', () => {
    const { manager } = createManager()
    establish()
    manager.joinBoardRoom('p1')
    fakeSocket.emit.mockClear()

    manager.leaveBoardRoom('p1')

    expect(fakeSocket.emit).toHaveBeenCalledWith('board:leave', { projectId: 'p1' })
    fakeSocket.emit.mockClear()

    establish()

    expect(fakeSocket.emit).not.toHaveBeenCalled()
  })

  it('does not emit board:leave while disconnected — the server forgot the room anyway', () => {
    const { manager } = createManager()
    manager.joinBoardRoom('p1')

    manager.leaveBoardRoom('p1')

    expect(fakeSocket.emit).not.toHaveBeenCalled()
  })

  it('a stale leave for another project does not clear the current room', () => {
    const { manager } = createManager()
    establish()
    manager.joinBoardRoom('p2')
    fakeSocket.emit.mockClear()

    manager.leaveBoardRoom('p1')
    establish()

    expect(fakeSocket.emit).toHaveBeenCalledWith('board:join', { projectId: 'p2' })
  })
})

describe('SocketManager connection:error (auth failure)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('disconnects, refreshes once, and reconnects with the fresh token', async () => {
    const { options } = createManager()

    await fire('connection:error', { message: 'Authentication failed' })

    expect(fakeSocket.disconnect).toHaveBeenCalled()
    expect(options.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fakeSocket.auth).toEqual({ token: 'refreshed-token' })
    expect(fakeSocket.connect).toHaveBeenCalled()
  })

  it('a second consecutive auth failure stays disconnected — no reconnect loop', async () => {
    const { options } = createManager()

    await fire('connection:error', { message: 'Authentication failed' })
    options.refreshAccessToken.mockClear()
    fakeSocket.connect.mockClear()

    await fire('connection:error', { message: 'Authentication failed' })

    expect(options.refreshAccessToken).not.toHaveBeenCalled()
    expect(fakeSocket.connect).not.toHaveBeenCalled()
  })

  it('a successful connect re-arms the single auth retry', async () => {
    const { options } = createManager()

    await fire('connection:error', { message: 'Authentication failed' })
    establish()
    await fire('connection:error', { message: 'Authentication failed' })

    expect(options.refreshAccessToken).toHaveBeenCalledTimes(2)
  })

  it('stays disconnected when the refresh yields no token', async () => {
    const { options } = createManager()
    options.refreshAccessToken.mockResolvedValue(null)

    await fire('connection:error', { message: 'Authentication failed' })

    expect(fakeSocket.connect).not.toHaveBeenCalled()
  })

  it('swallows a failed refresh and stays disconnected', async () => {
    const { options } = createManager()
    options.refreshAccessToken.mockRejectedValue(new Error('refresh down'))

    await fire('connection:error', { message: 'Authentication failed' })

    expect(fakeSocket.connect).not.toHaveBeenCalled()
  })
})
