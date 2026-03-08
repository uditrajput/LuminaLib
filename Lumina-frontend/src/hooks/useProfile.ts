import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateMyProfile, changePassword } from "@/services/userService";
import { UserUpdate, PasswordChange } from "@/types/user";

export const useMyProfile = () => {
    return useQuery({
        queryKey: ["user", "profile"],
        queryFn: getMyProfile,
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UserUpdate) => updateMyProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
        },
    });
};

export const useChangePassword = () => {
    return useMutation({
        mutationFn: (data: PasswordChange) => changePassword(data),
    });
};
