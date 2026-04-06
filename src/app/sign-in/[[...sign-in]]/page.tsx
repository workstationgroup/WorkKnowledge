import { signIn } from "@/auth";
import { BookOpen } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="mb-8 text-center px-4">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">WSO Knowledge Base</h1>
        <p className="text-gray-500 mt-1">Work Station Office (Thailand)</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
        <p className="text-sm text-gray-400 mb-6">
          Use your Work Station Office Microsoft 365 account
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            {/* Microsoft logo */}
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Sign in with Microsoft 365
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-5 text-center">
          Only Work Station Office employees can access this system.
        </p>
      </div>
    </div>
  );
}
