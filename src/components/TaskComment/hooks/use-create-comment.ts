import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComment } from "@/services/comment.service";
import { useStoreUser } from "@/stores/use-store-user";
import {
  addSubscribersToCache,
  makeSubscriber,
  restoreSubscribers,
  snapshotSubscribers,
  subscribersKey,
} from "@/lib/subscriber-cache";
import { parseMentions } from "../parse-mentions";
import type { ISubscriber } from "@/types";

export const useCreateComment = (taskId: string) => {
  const queryClient = useQueryClient();
  const user = useStoreUser((s) => s.user);

  return useMutation({
    mutationFn: (content: string) => createComment(taskId, { content }),
    // Commenting (and @mentioning) auto-subscribes users server-side — reflect
    // it in the subscriber list immediately.
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: subscribersKey(taskId) }); // 1. stop any in-flight GET /subscribers
      const previousSubscribers = snapshotSubscribers(queryClient, taskId); // 2. snapshot the true pre-mutation cache

      // 3. write the optimistic value: add the commenter + any @mentioned users
      const now = new Date().toISOString();
      const additions: ISubscriber[] = [];
      if (user) additions.push(makeSubscriber(user, "commented", now));
      for (const m of parseMentions(content)) {
        additions.push(
          makeSubscriber(
            { id: m.id, full_name: m.label, avatar_url: null },
            "mentioned",
            now,
          ),
        );
      }
      addSubscribersToCache(queryClient, taskId, additions);
      return { previousSubscribers };
    },
    onError: (_error, _content, context) => {
      restoreSubscribers(queryClient, taskId, context?.previousSubscribers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["subscription", taskId] });
      queryClient.invalidateQueries({ queryKey: subscribersKey(taskId) });
    },
  });
}
