export interface UserPreference {
    id: number | string;
    user_id: number | string;
    preferences: Record<string, any>;
    created_at?: string;
    updated_at?: string;
}

export interface UserPreferencesUpdate {
    preferences: Record<string, any>;
}
