export interface User {
    id: string;
    email: string;
    role: "admin" | "user";
    is_active?: boolean;
    is_locked?: boolean;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    profile_completed?: boolean;
    dob?: string;
    profession?: string;
    hobbies?: string[];
    interests?: string[];
    favorite_topics?: string[];
    favorite_genres?: string[];
    reading_preferences?: string[];
    preferred_language?: string;
    education_records?: Record<string, any>[];
    contact_info?: Record<string, any>;
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
    profile_completed?: boolean;
    dob?: string;
    profession?: string;
    hobbies?: string[];
    interests?: string[];
    favorite_topics?: string[];
    favorite_genres?: string[];
    reading_preferences?: string[];
    preferred_language?: string;
    education_records?: Record<string, any>[];
    contact_info?: Record<string, any>;
}

export interface AdminUserUpdate {
    email?: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    role?: "admin" | "user";
    is_active?: boolean;
    is_locked?: boolean;
    profile_completed?: boolean;
    dob?: string;
    profession?: string;
    hobbies?: string[];
    interests?: string[];
    favorite_topics?: string[];
    favorite_genres?: string[];
    reading_preferences?: string[];
    preferred_language?: string;
    education_records?: Record<string, any>[];
    contact_info?: Record<string, any>;
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

export interface BorrowedBookInfo {
    book_id: number;
    title: string;
    author?: string;
    cover_image_url?: string;
    borrowed_at: string;
    returned_at?: string;
}

export interface UserDashboardMetrics {
    total_borrowed: number;
    currently_borrowed: number;
    returned: number;
    active_borrows: BorrowedBookInfo[];
    recent_returns: BorrowedBookInfo[];
}


