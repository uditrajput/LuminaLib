export interface Book {
    id: string | number;
    title: string;
    author: string;
    genre: string;
    year_published: number;
    description?: string;
    language?: string;
    cover_image_url?: string;
    file_name?: string;
    created_at: string;
    updated_at: string;
}

export interface BookCreate {
    title: string;
    author: string;
    genre: string;
    year_published: number;
    description?: string;
    language?: string;
    cover_image_url?: string;
}
