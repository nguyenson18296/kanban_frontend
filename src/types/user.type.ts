interface IUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team_id: number;
  team: {
    id: number;
    name: string;
    description: string;
    color: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  avatar_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type { IUser };
