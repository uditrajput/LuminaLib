import { useQuery } from "@tanstack/react-query";
import { getRecommendations } from "@/services/recommendationService";

export const useRecommendations = (limit: number = 5, bookId?: number) => {
    return useQuery({
        queryKey: ["recommendations", limit, bookId],
        queryFn: () => getRecommendations(limit, bookId),
    });
};
