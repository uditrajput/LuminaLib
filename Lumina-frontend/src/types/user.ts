export interface User {
    id: string;
    email: string;
    role: "admin" | "user";
    is_active?: boolean;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    created_date?: string;
    updated_date?: string;
}

export interface Token {
    access_token: string;
    token_type: string;
}

export interface UserUpdate {
    email?: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
}

export interface AdminUserUpdate {
    email?: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    role?: "admin" | "user";
    is_active?: boolean;
    new_password?: string;
}

export interface UserCreate {
    email: string;
    password: string;
    role: "admin" | "user";
    full_name?: string;
    bio?: string;
    is_active?: boolean;
}

export interface PasswordChange {
    current_password: string;
    new_password: string;
}

export interface PaginatedUserResponse {
    items: User[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export interface UserStats {
    total: number;
    admins: number;
    regular_users: number;
    newest_user_email?: string;
}


