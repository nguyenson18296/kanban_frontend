import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'

import { WebSocketProvider } from '../websocket-provider'
import { useWebSocket } from '@/hooks/use-websocket'
import { SocketManager } from '@/services/socket-manager'

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ latestLocation: { pathname: '/' }, navigate: vi.fn() }),
}))
vi.mock('@/lib/cookie', () => ({ getCookie: () => 'a-token' }))
vi.mock('@/lib/http-client', () => ({ tryRefreshTokens: vi.fn() }))
vi.mock('@/lib/presence/bootstrap', () => ({
  applyPresenceUpdate: vi.fn(),
  resetPresence: vi.fn(),
  scheduleRefetchVisiblePresence: vi.fn(),
}))

// One shared fake manager instance so tests can assert on its methods.
const { managerInstance } = vi.hoisted(() => ({
  managerInstance: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinBoardRoom: vi.fn(),
    leaveBoardRoom: vi.fn(),
  },
}))
vi.mock('@/services/socket-manager', () => ({
  // `function` (not an arrow) so `new SocketManager(...)` is constructible;
  // returning an object makes it the constructed instance.
  SocketManager: vi.fn(function () {
    return managerInstance
  }),
}))
const mockedSocketManager = vi.mocked(SocketManager)

/** Mirrors useBoardRoom's join-on-mount / leave-on-unmount effect. */
function JoinProbe({ id }: Readonly<{ id: string }>) {
  const { joinBoardRoom, leaveBoardRoom } = useWebSocket()
  useEffect(() => {
    joinBoardRoom(id)
    return () => leaveBoardRoom(id)
  }, [id, joinBoardRoom, leaveBoardRoom])
  return null
}

function RoomSnapshot() {
  const { boardRoom } = useWebSocket()
  return (
    <div data-testid="room">
      {boardRoom ? `${boardRoom.projectId}:${boardRoom.status}` : 'none'}
    </div>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('WebSocketProvider board rooms (JAV-32)', () => {
  it('flushes a join requested before the manager exists — child effects run first', () => {
    render(
      <WebSocketProvider>
        <JoinProbe id="p1" />
      </WebSocketProvider>,
    )

    expect(managerInstance.connect).toHaveBeenCalled()
    // The probe's effect ran before the provider's own effect created the
    // manager; desiredBoardRoomRef must have queued the room until then.
    expect(managerInstance.joinBoardRoom).toHaveBeenCalledWith('p1')
  })

  it('publishes room status and clears the snapshot when that board leaves', () => {
    const { rerender } = render(
      <WebSocketProvider>
        <JoinProbe id="p1" />
        <RoomSnapshot />
      </WebSocketProvider>,
    )
    const options = mockedSocketManager.mock.calls[0][0]

    act(() => options.onBoardRoomStatus?.('p1', 'joined'))
    expect(screen.getByTestId('room')).toHaveTextContent('p1:joined')

    // Unmounting the board leaves the room and drops the stale snapshot.
    rerender(
      <WebSocketProvider>
        <RoomSnapshot />
      </WebSocketProvider>,
    )
    expect(managerInstance.leaveBoardRoom).toHaveBeenCalledWith('p1')
    expect(screen.getByTestId('room')).toHaveTextContent('none')
  })
})
