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
    on: (event: string, cb: (...args: unknown[]) => unknown) => {
      handlers.set(event, cb)
    },
    io: {
      on: (event: string, cb: (...args: unknown[]) => unknown) => {
        managerHandlers.set(event, cb)
      },
    },
    emit: () => {},
    removeAllListeners: () => {
      handlers.clear()
      managerHandlers.clear()
    },
    disconnect: () => {},
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

function createManager(overrides: { getAccessToken?: () => string | null } = {}) {
  const options = {
    getAccessToken: vi.fn(overrides.getAccessToken ?? (() => jwtWithExp(3600))),
    refreshAccessToken: vi.fn(async () => 'refreshed-token'),
    onNotification: vi.fn(),
    onStatusChange: vi.fn(),
  }
  const manager = new SocketManager(options)
  manager.connect()
  const reconnectAttempt = fakeSocket.managerHandlers.get('reconnect_attempt')
  if (!reconnectAttempt) throw new Error('reconnect_attempt handler was not registered')
  return { manager, options, reconnectAttempt }
}

beforeEach(() => {
  fakeSocket.handlers.clear()
  fakeSocket.managerHandlers.clear()
  fakeSocket.auth = {}
})

afterEach(() => {
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
})
