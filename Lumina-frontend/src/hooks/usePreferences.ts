import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserPreferences, updateUserPreferences } from "@/services/userService";
import { UserPreferencesUpdate } from "@/types/preference";

export const useUserPreferences = () => {
    return useQuery({
        queryKey: ["user", "preferences"],
        queryFn: getUserPreferences,
    });
};

export const useUpdateUserPreferences = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UserPreferencesUpdate) => updateUserPreferences(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user", "preferences"] });
        },
    });
};
