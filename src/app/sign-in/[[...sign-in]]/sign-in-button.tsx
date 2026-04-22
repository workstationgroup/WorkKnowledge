"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
      )}
      {pending ? "Signing in…" : "Sign in with Microsoft 365"}
    </button>
  );
}
