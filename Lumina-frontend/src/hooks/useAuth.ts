import { useAuthContext } from "@/context/AuthContext";

export const useAuth = () => {
    const context = useAuthContext();
    return context;
};
