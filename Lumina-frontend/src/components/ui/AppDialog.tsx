"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

type DialogType = "alert" | "confirm";
type DialogVariant = "info" | "success" | "error" | "warning" | "danger";

type DialogState = {
  open: boolean;
  type: DialogType;
  title: string;
  message: string;
  variant: DialogVariant;
  confirmText: string;
  cancelText: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type DialogContextType = {
  showAlert: (message: string, opts?: { title?: string; variant?: DialogVariant; confirmText?: string }) => void;
  showConfirm: (message: string, onConfirm: () => void, opts?: { title?: string; variant?: DialogVariant; confirmText?: string; cancelText?: string }) => void;
  showConfirmAsync: (message: string, opts?: { title?: string; variant?: DialogVariant; confirmText?: string; cancelText?: string }) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | null>(null);

export function useAppDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    // Fallback for tests / outside provider — no throw, use console/window
    return {
      showAlert: (message: string) => { if (typeof window !== "undefined") console.log("[Dialog]", message); },
      showConfirm: (message: string, onConfirm: () => void) => { if (typeof window !== "undefined" && window.confirm(message)) onConfirm(); },
      showConfirmAsync: async (message: string) => (typeof window !== "undefined" ? window.confirm(message) : false),
    };
  }
  return ctx;
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    open: false,
    type: "alert",
    title: "",
    message: "",
    variant: "info",
    confirmText: "OK",
    cancelText: "Cancel",
  });
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const close = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    if (resolver) {
      resolver(false);
      setResolver(null);
    }
  }, [resolver]);

  const showAlert = useCallback((message: string, opts?: { title?: string; variant?: DialogVariant; confirmText?: string }) => {
    setState({
      open: true,
      type: "alert",
      title: opts?.title || (opts?.variant === "success" ? "Success" : opts?.variant === "error" ? "Error" : "Notice"),
      message,
      variant: opts?.variant || "info",
      confirmText: opts?.confirmText || "OK",
      cancelText: "Cancel",
    });
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, opts?: { title?: string; variant?: DialogVariant; confirmText?: string; cancelText?: string }) => {
    setState({
      open: true,
      type: "confirm",
      title: opts?.title || "Please confirm",
      message,
      variant: opts?.variant || "info",
      confirmText: opts?.confirmText || "Confirm",
      cancelText: opts?.cancelText || "Cancel",
      onConfirm,
    });
  }, []);

  const showConfirmAsync = useCallback((message: string, opts?: { title?: string; variant?: DialogVariant; confirmText?: string; cancelText?: string }): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
      setState({
        open: true,
        type: "confirm",
        title: opts?.title || "Please confirm",
        message,
        variant: opts?.variant || "danger",
        confirmText: opts?.confirmText || "Confirm",
        cancelText: opts?.cancelText || "Cancel",
      });
    });
  }, []);

  const handleConfirm = () => {
    if (state.type === "confirm" && state.onConfirm) state.onConfirm();
    if (resolver) {
      resolver(true);
      setResolver(null);
    }
    setState(s => ({ ...s, open: false }));
  };

  const handleCancel = () => {
    if (resolver) {
      resolver(false);
      setResolver(null);
    }
    setState(s => ({ ...s, open: false }));
  };

  const variantIcon = {
    info: <Info className="h-6 w-6 text-blue-600" />,
    success: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
    error: <AlertCircle className="h-6 w-6 text-red-600" />,
    warning: <AlertTriangle className="h-6 w-6 text-amber-600" />,
    danger: <AlertTriangle className="h-6 w-6 text-red-600" />,
  }[state.variant] || <Info className="h-6 w-6 text-blue-600" />;

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showConfirmAsync }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={state.type === "alert" ? handleConfirm : handleCancel} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${state.variant === "success" ? "bg-emerald-50 dark:bg-emerald-900/30" : state.variant === "error" || state.variant === "danger" ? "bg-red-50 dark:bg-red-900/20" : state.variant === "warning" ? "bg-amber-50 dark:bg-amber-900/20" : "bg-blue-50 dark:bg-blue-900/20"}`}>
                  {variantIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{state.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{state.message}</p>
                </div>
                <button onClick={state.type === "alert" ? handleConfirm : handleCancel} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-3 justify-end p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
              {state.type === "confirm" && (
                <button onClick={handleCancel} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
                  {state.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm ${
                  state.variant === "danger" || state.variant === "error" ? "bg-red-600 hover:bg-red-700" : state.variant === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
