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
 * assignable or removable from this UI (ownership transfer is out of scope).
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

export { ROLE_LABELS, assignableRoles, isProjectRole, normalizeProjectRole };
