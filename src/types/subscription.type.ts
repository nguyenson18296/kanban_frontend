type SubscriptionSource =
  | "assigned"
  | "mentioned"
  | "commented"
  | "manual"
  | "created";

interface ISubscriptionStatus {
  subscribed: boolean;
  source: SubscriptionSource | null;
  since: string | null;
}

interface ISubscriber {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  source: SubscriptionSource;
  created_at: string;
}

interface ISubscriberListResponse {
  items: ISubscriber[];
}

export type {
  SubscriptionSource,
  ISubscriptionStatus,
  ISubscriber,
  ISubscriberListResponse,
};
