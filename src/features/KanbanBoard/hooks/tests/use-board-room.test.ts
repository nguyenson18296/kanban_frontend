import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useBoardRoom } from '../use-board-room'
import { useWebSocket } from '@/hooks/use-websocket'
import type { WebSocketContextValue } from '@/providers/websocket-provider'

vi.mock('@/hooks/use-websocket', () => ({ useWebSocket: vi.fn() }))
const mockedUseWebSocket = vi.mocked(useWebSocket)

function makeContext(overrides: Partial<WebSocketContextValue> = {}): WebSocketContextValue {
  return {
    status: 'connected',
    boardRoom: null,
    joinBoardRoom: vi.fn(),
    leaveBoardRoom: vi.fn(),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useBoardRoom', () => {
  it('joins the room on mount and leaves it on unmount', () => {
    const ctx = makeContext()
    mockedUseWebSocket.mockReturnValue(ctx)

    const { unmount } = renderHook(() => useBoardRoom('p1'))

    expect(ctx.joinBoardRoom).toHaveBeenCalledWith('p1')
    expect(ctx.leaveBoardRoom).not.toHaveBeenCalled()

    unmount()

    expect(ctx.leaveBoardRoom).toHaveBeenCalledWith('p1')
  })

  it('leaves the old room and joins the new one when the project changes', () => {
    const ctx = makeContext()
    mockedUseWebSocket.mockReturnValue(ctx)

    const { rerender } = renderHook(({ id }) => useBoardRoom(id), {
      initialProps: { id: 'p1' },
    })
    rerender({ id: 'p2' })

    expect(ctx.leaveBoardRoom).toHaveBeenCalledWith('p1')
    expect(ctx.joinBoardRoom).toHaveBeenLastCalledWith('p2')
  })

  it('does not join without a projectId', () => {
    const ctx = makeContext()
    mockedUseWebSocket.mockReturnValue(ctx)

    const { result } = renderHook(() => useBoardRoom(''))

    expect(ctx.joinBoardRoom).not.toHaveBeenCalled()
    expect(result.current).toBe('idle')
  })

  it("returns the room status when the snapshot matches the hook's project", () => {
    mockedUseWebSocket.mockReturnValue(
      makeContext({ boardRoom: { projectId: 'p1', status: 'denied' } }),
    )

    const { result } = renderHook(() => useBoardRoom('p1'))

    expect(result.current).toBe('denied')
  })

  it("returns 'idle' when the snapshot belongs to another project", () => {
    mockedUseWebSocket.mockReturnValue(
      makeContext({ boardRoom: { projectId: 'p2', status: 'joined' } }),
    )

    const { result } = renderHook(() => useBoardRoom('p1'))

    expect(result.current).toBe('idle')
  })
})
