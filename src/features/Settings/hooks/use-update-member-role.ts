import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateMemberRole } from "@/services/project.service";
import { toastError } from "@/lib/toast-error";
import type { IProjectMember, ProjectRole } from "@/types";

interface UpdateMemberRoleInput {
  userId: string;
  role: ProjectRole;
}

interface UpdateMemberRoleContext {
  previous: IProjectMember[] | undefined;
}

/**
 * Change a member's project role. Cache-backed optimism (no Zustand store):
 * the members list is patched immediately in onMutate, restored from the
 * snapshot on error (e.g. a 403 race where the actor was just demoted), and
 * re-validated against the server on settle.
 */
export function useUpdateMemberRole(projectId: string | null) {
  const queryClient = useQueryClient();
  const membersKey = ["project-members", projectId] as const;

  return useMutation<IProjectMember, Error, UpdateMemberRoleInput, UpdateMemberRoleContext>({
    mutationFn: async ({ userId, role }) => {
      if (!projectId) throw new Error("No active project selected");
      return updateMemberRole(projectId, userId, role);
    },
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: membersKey });
      const previous = queryClient.getQueryData<IProjectMember[]>(membersKey);
      if (previous) {
        queryClient.setQueryData<IProjectMember[]>(
          membersKey,
          previous.map((member) => (member.user.id === userId ? { ...member, role } : member)),
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(membersKey, context.previous);
      }
      toastError(error, "Couldn't update the member's role. Please try again.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: membersKey });
    },
  });
}
