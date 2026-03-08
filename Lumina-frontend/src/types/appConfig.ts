export interface AppConfig {
    id: number;
    key: string;
    value: string;
    description?: string;
}

export interface AppConfigCreate {
    key: string;
    value: string;
    description?: string;
}

export interface AppConfigUpdate {
    value?: string;
    description?: string;
}
