import { useState } from "react";

import { useStoreUser } from "@/stores/use-store-user";
import type { TAssignee } from "@/types";

// TODO(subscriptions): this is a UI-only stub. Once the backend exposes
// task-subscription endpoints, replace the stub data + local toggle with a real
// data layer, keeping this hook's return shape identical so `Subscribers` needs
// no changes:
//   - services/subscription.service.ts (getSubscribers / subscribe / unsubscribe)
//   - use-get-subscribers(taskId) query that seeds `subscribers`
//   - use-toggle-subscription mutation for `toggle` (invalidate
//     ['activities', taskId] on settle; revert on error)
const STUB_SUBSCRIBERS: TAssignee[] = [
  { id: "stub-ac", full_name: "Alex Chen", avatar_url: "" },
  { id: "stub-mr", full_name: "Maria Rodriguez", avatar_url: "" },
];

const STUB_CURRENT_USER: TAssignee = {
  id: "stub-you",
  full_name: "You",
  avatar_url: "",
};

interface UseTaskSubscription {
  subscribers: TAssignee[];
  isSubscribed: boolean;
  toggle: () => void;
}

export function useTaskSubscription(taskId: string): UseTaskSubscription {
  // Real current user (persisted) when available; placeholder in the stub.
  const user = useStoreUser((s) => s.user);
  const currentUser: TAssignee = user
    ? { id: user.id, full_name: user.full_name, avatar_url: user.avatar_url }
    : STUB_CURRENT_USER;

  const [isSubscribed, setIsSubscribed] = useState(true);

  const toggle = () => {
    // TODO(subscriptions): call the subscribe/unsubscribe mutation for `taskId`.
    void taskId;
    setIsSubscribed((prev) => !prev);
  };

  // Derive the visible list: the current user is a subscriber only while subscribed.
  const subscribers = isSubscribed
    ? [...STUB_SUBSCRIBERS, currentUser]
    : STUB_SUBSCRIBERS;

  return { subscribers, isSubscribed, toggle };
}
