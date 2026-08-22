"use client";

import { useAuthContext } from "@/context/AuthContext";
import { ProfileCompletionModal } from "./ProfileCompletionModal";

export default function GlobalProfileModal() {
    const { user, isLoading } = useAuthContext();
    
    if (isLoading || !user) return null;
    
    return <ProfileCompletionModal user={user} />;
}
