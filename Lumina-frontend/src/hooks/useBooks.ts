import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBooks, getBookById, createBook, BookListResponse } from "@/services/bookService";
import { BookCreate } from "@/types/book";

interface UseBooksParams {
    page?: number;
    size?: number;
    limit?: number;
    q?: string;
    catalog?: string;
}

export const useBooks = (
    pageOrParams: number | UseBooksParams = 1,
    size = 20,
    q = "",
    catalog = "public"
) => {
    let pageNum = 1;
    let sizeNum = 20;
    let queryStr = "";
    let catalogStr = "public";

    if (typeof pageOrParams === "object" && pageOrParams !== null) {
        pageNum = pageOrParams.page ?? 1;
        sizeNum = pageOrParams.limit ?? pageOrParams.size ?? 20;
        queryStr = pageOrParams.q ?? "";
        catalogStr = pageOrParams.catalog ?? "public";
    } else {
        pageNum = pageOrParams;
        sizeNum = size;
        queryStr = q;
        catalogStr = catalog;
    }

    return useQuery<BookListResponse>({
        queryKey: ["books", pageNum, sizeNum, queryStr, catalogStr],
        queryFn: () => getBooks(pageNum, sizeNum, queryStr, catalogStr),
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
