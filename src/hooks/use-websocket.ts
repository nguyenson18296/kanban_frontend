import { useContext } from 'react'
import { WebSocketContext } from '@/providers/websocket-provider'
import type { WebSocketContextValue } from '@/providers/websocket-provider'

export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
