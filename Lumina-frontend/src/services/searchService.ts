import apiClient from "./apiClient";
export const searchService = {
  hybrid: (q: string, book_id?: number) =>
    apiClient.get(`/search`, { params: { q, book_id } }).then(r => r.data),
};
