interface INotification {
  id: string;
  type: NotificationType;
  actor: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    team_id: number;
    avatar_url: string;
    is_active: boolean;
  };
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface INotificationUnreadCount {
  count: number;
}

interface INotificationReadPayload {
  ids: string[];
}

export const NotificationType = {
  COMMENT_CREATED: 'comment_created',
  COMMENT_MENTIONED: 'comment_mentioned',
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export type { INotification, INotificationUnreadCount, INotificationReadPayload };
