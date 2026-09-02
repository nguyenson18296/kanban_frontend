import type { IUser } from './user.type';

interface IProject {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  creator?: IUser | null;
  created_at: string;
  updated_at: string;
}

/** Backend project role, highest first — see `features/Settings/member-roles.ts` for rank/policy helpers. */
type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

/** One row of `GET /projects/:projectId/members` — the membership plus the member's profile. */
interface IProjectMember {
  project_id: string;
  user_id: string;
  /** Project role (e.g. "owner" | "admin" | "member") — not the user's job role. */
  role: string;
  joined_at: string;
  user: Pick<
    IUser,
    'id' | 'email' | 'full_name' | 'role' | 'avatar_url' | 'is_active' | 'created_at' | 'updated_at'
  >;
}

/** Envelope returned by the project members endpoint. */
interface IProjectMembersResponse {
  data: IProjectMember[];
  status: number;
  success: boolean;
}

export type { IProject, IProjectMember, IProjectMembersResponse, ProjectRole };
