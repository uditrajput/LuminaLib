export interface Review {
    id: number;
    book_id: number;
    user_id: number;
    review_text: string;
    rating: number;
    full_name?: string;
    created_date: string;
    created_at?: string;
}

export interface ReviewCreate {
    review_text: string;
    rating: number;
}

export interface BorrowStatus {
    status: "available" | "borrowed" | "returned" | "Available" | "Borrowed" | "Returned";
    borrowed_at?: string;
    returned_at?: string;
}

export interface BookSummary {
    book_id: number;
    summary?: string;
    review_summary?: string;
    average_rating: number;
    total_reviews: number;
}
