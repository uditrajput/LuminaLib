import React from "react";
import { PendingAction } from "@/hooks/useVoiceSession";
import { AlertCircle, Check, X } from "lucide-react";

interface ActionConfirmationProps {
    pendingAction: PendingAction;
    onConfirm: (actionId: string, confirmed: boolean) => void;
}

export const ActionConfirmation: React.FC<ActionConfirmationProps> = ({
    pendingAction,
    onConfirm,
}) => {
    return (
        <div className="bg-gradient-to-r from-amber-950/80 to-purple-950/80 border border-amber-500/40 rounded-xl p-4 my-3 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                <AlertCircle className="h-5 w-5" />
                <span>Voice Action Confirmation</span>
            </div>
            <p className="text-gray-200 text-sm mb-3">{pendingAction.message}</p>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onConfirm(pendingAction.action_id, true)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 px-3 rounded-lg text-sm transition-colors"
                >
                    <Check className="h-4 w-4" />
                    Confirm
                </button>
                <button
                    onClick={() => onConfirm(pendingAction.action_id, false)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-1.5 px-3 rounded-lg text-sm transition-colors"
                >
                    <X className="h-4 w-4" />
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ActionConfirmation;
