'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/services/apiClient';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage('Invalid or missing verification token.');
      return;
    }

    apiClient
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setSuccess(true);
        setMessage(res.data?.message || 'Email verified successfully! Your account is pending admin approval.');
      })
      .catch((err) => {
        setSuccess(false);
        setMessage(err?.response?.data?.error_message || err?.message || 'Verification link expired or invalid.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-8 text-center shadow-2xl space-y-6 animate-fade-in">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
        <ShieldCheck className="w-8 h-8" />
      </div>

      {loading ? (
        <div className="py-6 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-300 text-sm font-medium">Verifying your email address...</p>
        </div>
      ) : success ? (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm rounded-2xl flex items-center gap-2 justify-center">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{message}</span>
          </div>
          <h2 className="text-xl font-bold text-white">Email Verification Complete</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Your account status is currently <strong>Pending Admin Review</strong>. Once approved, you will be able to sign in and access LuminaLib.
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all"
            >
              Return to Login Page
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-sm rounded-2xl flex items-center gap-2 justify-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{message}</span>
          </div>
          <h2 className="text-xl font-bold text-white">Verification Failed</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            The link may have expired or already been used. Please contact your system administrator.
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-block w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-sm transition-all"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-8 text-center shadow-2xl space-y-6">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-slate-300 text-sm font-medium">Loading verification...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
