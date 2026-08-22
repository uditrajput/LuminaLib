export interface Role {
  id: number;
  name: string;
  description?: string;
  is_system: boolean;
  permissions_json: string[] | Record<string, boolean>;
  created_at?: string;
}

export interface UserGroup {
  id: number;
  name: string;
  description?: string;
  created_by_user_id?: number;
}

export interface GroupMember {
  user_id: number;
  role_in_group: 'student' | 'teacher';
  joined_at?: string;
}

export interface BookGroupEntitlement {
  book_id: number;
  group_id: number;
  assigned_at?: string;
}
