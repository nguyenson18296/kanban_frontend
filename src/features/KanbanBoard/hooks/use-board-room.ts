import { useEffect } from 'react'

import { useWebSocket } from '@/hooks/use-websocket'
import type { BoardRoomStatus } from '@/services/socket-manager'

// Derived from the manager's status union so the two can't drift.
export type BoardRoomState = BoardRoomStatus | 'idle'

/**
 * Subscribe the open board to its project room (JAV-32, socket contract §5).
 * Joins on mount and re-joins automatically after reconnects (the manager
 * re-sends board:join on every connection:established); leaves on unmount or
 * when the user switches to another project. A denied join means the same as
 * an HTTP 404 on the board — render the not-found state, never retry in a loop.
 */
export function useBoardRoom(projectId: string): BoardRoomState {
  const { boardRoom, joinBoardRoom, leaveBoardRoom } = useWebSocket()

  useEffect(() => {
    if (!projectId) return
    joinBoardRoom(projectId)
    return () => leaveBoardRoom(projectId)
  }, [projectId, joinBoardRoom, leaveBoardRoom])

  return boardRoom?.projectId === projectId ? boardRoom.status : 'idle'
}
