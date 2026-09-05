import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { HttpError } from "@/lib/http-client";
import { toastError } from "@/lib/toast-error";
import { removeProjectMembers } from "@/services/project.service";
import { useStoreUser } from "@/stores/use-store-user";
import type { IProjectMember } from "@/types";

interface RemoveMemberInput {
  userId: string;
}

interface RemoveMemberContext {
  previous: IProjectMember[] | undefined;
}

/**
 * Remove one member from the project — or leave it, when the id is the
 * caller's own (JAV-15 allows self-leave at any role). Cache-backed optimism
 * (no Zustand store): the row is dropped immediately in onMutate, restored
 * from the snapshot on error (a 403 race, the last-owner 409), and
 * re-validated against the server on settle.
 */
export function useRemoveMember(projectId: string | null) {
  const queryClient = useQueryClient();
  const membersKey = ["project-members", projectId] as const;

  return useMutation<void, Error, RemoveMemberInput, RemoveMemberContext>({
    mutationFn: async ({ userId }) => {
      if (!projectId) throw new Error("No active project selected");
      return removeProjectMembers(projectId, [userId]);
    },
    onMutate: async ({ userId }) => {
      await queryClient.cancelQueries({ queryKey: membersKey });
      const previous = queryClient.getQueryData<IProjectMember[]>(membersKey);
      if (previous) {
        queryClient.setQueryData<IProjectMember[]>(
          membersKey,
          previous.filter((member) => member.user.id !== userId),
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(membersKey, context.previous);
      }
      if (error instanceof HttpError && error.status === 409) {
        // Last-owner guard (JAV-15): the server message alone doesn't say how
        // to proceed, so add the way out.
        toast.error(
          "A project must have at least one owner — transfer ownership to someone else, then try again.",
        );
        return;
      }
      toastError(error, "Couldn't remove the member. Please try again.");
    },
    onSettled: (_data, error, { userId }) => {
      // After a successful self-leave the members endpoint 404s for the caller
      // (masked) — drop the cache entry instead of refetching into an error.
      if (!error && userId === useStoreUser.getState().user?.id) {
        queryClient.removeQueries({ queryKey: membersKey });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: membersKey });
    },
  });
}
