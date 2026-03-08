import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBooks, getBookById, createBook, BookListResponse } from "@/services/bookService";
import { BookCreate } from "@/types/book";

export const useBooks = (page = 1, size = 20, q = "") => {
    return useQuery<BookListResponse>({
        queryKey: ["books", page, size, q],
        queryFn: () => getBooks(page, size, q),
    });
};

export const useBook = (id: string | number) => {
    return useQuery({
        queryKey: ["books", id],
        queryFn: () => getBookById(id),
        enabled: !!id,
    });
};

export const useCreateBook = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: BookCreate) => createBook(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["books"] });
        },
    });
};
