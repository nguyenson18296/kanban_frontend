import { createContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import {
  MessageSquare,
  AtSign,
  UserPlus,
  ArrowRight,
  Bell,
} from 'lucide-react'

import {
  SocketManager,
  type ConnectionStatus,
  type WsNotification,
} from '../services/socket-manager'
import { getCookie } from '@/lib/cookie'
import { tryRefreshTokens } from '@/lib/http-client'
import { queryClient } from '@/lib/query-client'
import { NotificationType } from '@/types/notification.type'
import {
  applyPresenceUpdate,
  resetPresence,
  scheduleRefetchVisiblePresence,
} from '@/lib/presence/bootstrap'

const NOTIFICATION_CONFIG: Record<
  WsNotification['type'],
  { label: string; icon: typeof Bell; color: string; bg: string }
> = {
  [NotificationType.COMMENT_CREATED]: {
    label: 'New Comment',
    icon: MessageSquare,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  [NotificationType.COMMENT_MENTIONED]: {
    label: 'Mentioned You',
    icon: AtSign,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  [NotificationType.TASK_ASSIGNED]: {
    label: 'Task Assigned',
    icon: UserPlus,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  [NotificationType.TASK_UPDATED]: {
    label: 'Task Updated',
    icon: ArrowRight,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
}

interface NotificationToastOptions {
  notification: WsNotification
  onNavigate: (projectId: string, ticketId: string, hash: string) => void
  currentPath: string
}

const FALLBACK_CONFIG = {
  label: 'Notification',
  icon: Bell,
  color: 'text-slate-600',
  bg: 'bg-slate-50',
} as const

function showNotificationToast({ notification, onNavigate, currentPath }: NotificationToastOptions) {
  const config = NOTIFICATION_CONFIG[notification.type] ?? FALLBACK_CONFIG
  const Icon = config.icon
  const taskTitle = notification.payload.task_title as string | undefined
  const actorName = notification.payload.author
    ? (notification.payload.author as { full_name?: string }).full_name
    : undefined
  const commentPreview = notification.payload.comment_preview as string | undefined
  const fromStatus = notification.payload.from_status as string | undefined
  const toStatus = notification.payload.to_status as string | undefined
  const ticketId = notification.payload.ticket_id as string | undefined
  const commentId = notification.payload.comment_id as string | undefined
  const projectId = currentPath.match(/\/projects\/([^/]+)/)?.[1]

  const handleClick = (id: string | number) => {
    toast.dismiss(id)
    if (projectId && ticketId) {
      const hash =
        notification.type === NotificationType.COMMENT_MENTIONED && commentId
          ? `comment-${commentId}`
          : ''
      onNavigate(projectId, ticketId, hash)
    }
  }

  toast.custom(
    (id) => (
      <div
        className="w-[360px] rounded-xl border border-[#e8ecf1] bg-white p-4 shadow-lg cursor-pointer transition-colors hover:bg-[#fafbfc]"
        role="button"
        tabIndex={0}
        onClick={() => handleClick(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick(id)
          }
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
          >
            <Icon className={`size-4 ${config.color}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
                {config.label}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toast.dismiss(id)
                }}
                className="text-[#94a3b8] hover:text-[#64748b] text-lg leading-none cursor-pointer bg-transparent border-none p-0"
                aria-label="Dismiss notification"
              >
                &times;
              </button>
            </div>

            {taskTitle && (
              <p className="mt-1 text-sm font-medium text-[#0f172a] truncate m-0">
                {taskTitle}
              </p>
            )}

            {actorName && (
              <p className="mt-0.5 text-xs text-[#64748b] m-0">
                by {actorName}
              </p>
            )}

            {commentPreview && (
              <p className="mt-1.5 text-xs text-[#94a3b8] truncate italic m-0">
                &ldquo;{commentPreview}&rdquo;
              </p>
            )}

            {fromStatus && toStatus && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-md bg-[#f59e0b]/10 px-2 py-0.5 text-[11px] font-semibold text-[#d97706] uppercase tracking-wide ring-1 ring-[#f59e0b]/20 ring-inset">
                  {fromStatus}
                </span>
                <ArrowRight className="size-3 text-[#cbd5e1]" />
                <span className="inline-flex items-center rounded-md bg-[#5a5cf2]/10 px-2 py-0.5 text-[11px] font-semibold text-[#5a5cf2] uppercase tracking-wide ring-1 ring-[#5a5cf2]/20 ring-inset">
                  {toStatus}
                </span>
              </div>
            )}

            {projectId && ticketId && (
              <p className="mt-2 text-[11px] font-medium text-[#5a5cf2] m-0">
                Click to view &rarr;
              </p>
            )}
          </div>
        </div>
      </div>
    ),
    { duration: 5000 },
  )
}

interface WebSocketContextValue {
  status: ConnectionStatus
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const managerRef = useRef<SocketManager | null>(null)
  const router = useRouter()
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  })

  useEffect(() => {
    const token = getCookie('access_token')
    if (!token) {
      managerRef.current?.disconnect()
      return
    }

    const manager = new SocketManager({
      getAccessToken: () => getCookie('access_token'),
      refreshAccessToken: async () => {
        await tryRefreshTokens()
        return getCookie('access_token')
      },
      onNotification: (notification: WsNotification) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        showNotificationToast({
          notification,
          currentPath: routerRef.current.latestLocation.pathname,
          onNavigate: (projectId, taskId, hash) => {
            routerRef.current.navigate({
              to: '/projects/$projectId/tasks/$taskId',
              params: { projectId, taskId },
              hash,
            })
          },
        })
      },
      onStatusChange: setStatus,
      onConnect: scheduleRefetchVisiblePresence,
      onPresenceUpdate: applyPresenceUpdate,
    })

    managerRef.current = manager
    manager.connect()

    return () => {
      manager.disconnect()
      managerRef.current = null
      resetPresence()
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ status }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export { WebSocketContext }
export type { WebSocketContextValue }
