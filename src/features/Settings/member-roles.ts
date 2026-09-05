import type { ProjectRole } from '@/types';

/** All backend project roles, highest first. */
const PROJECT_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;

const ROLE_RANK: Record<ProjectRole, number> = { owner: 3, admin: 2, member: 1, viewer: 0 };

const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

// Module-level constants so rows get stable references across renders.
const NO_ROLES: readonly ProjectRole[] = [];
const OWNER_ASSIGNABLE: readonly ProjectRole[] = ['admin', 'member', 'viewer'];
const ADMIN_ASSIGNABLE: readonly ProjectRole[] = ['member', 'viewer'];

function isProjectRole(value: string): value is ProjectRole {
  return (PROJECT_ROLES as readonly string[]).includes(value);
}

/** Map whatever the backend sent onto a known role; unknown roles read as plain members. */
function normalizeProjectRole(role: string | undefined): ProjectRole {
  const lower = role?.toLowerCase() ?? '';
  return isProjectRole(lower) ? lower : 'member';
}

/**
 * Roles the actor may assign to the target — UX gating only; the backend
 * (PATCH /projects/:id/members/:userId, JAV-14) is the enforcement layer.
 * Mirrors its policy: base gate admin; touching owner/admin in either
 * direction is owner-only; no self-change. The owner role itself is never
 * offered by this dropdown — it can't be granted, and an owner can't be
 * demoted (ownership transfer is out of scope). Removing someone from the
 * project entirely — owners included — is `canRemoveMember`'s policy below.
 * An empty result means the row is read-only.
 */
function assignableRoles(
  actorRole: ProjectRole | null,
  targetRole: ProjectRole,
  isSelf: boolean,
): readonly ProjectRole[] {
  if (!actorRole || isSelf) return NO_ROLES;
  if (ROLE_RANK[actorRole] < ROLE_RANK.admin) return NO_ROLES;
  if (targetRole === 'owner') return NO_ROLES;
  if (actorRole === 'owner') return OWNER_ASSIGNABLE;
  if (targetRole === 'admin') return NO_ROLES; // only the owner may change another admin
  return ADMIN_ASSIGNABLE;
}

/**
 * Whether the actor may remove the target from the project — UX gating only;
 * DELETE /projects/:id/members (JAV-15) is the enforcement layer. Mirrors its
 * policy: self-leave is allowed at any role; removing a member/viewer needs
 * admin+; removing an admin/owner needs owner. The backend's last-owner guard
 * (409) can't be decided per-row here — the server rejects it.
 */
function canRemoveMember(
  actorRole: ProjectRole | null,
  targetRole: ProjectRole,
  isSelf: boolean,
): boolean {
  if (!actorRole) return false;
  if (isSelf) return true;
  const requiredRank = ROLE_RANK[targetRole] >= ROLE_RANK.admin ? ROLE_RANK.owner : ROLE_RANK.admin;
  return ROLE_RANK[actorRole] >= requiredRank;
}

export { ROLE_LABELS, assignableRoles, canRemoveMember, isProjectRole, normalizeProjectRole };
