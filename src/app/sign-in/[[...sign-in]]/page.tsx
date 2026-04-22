import { signIn } from "@/auth";
import { BookOpen } from "lucide-react";
import { SignInButton } from "./sign-in-button";

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
          <SignInButton />
        </form>

        <p className="text-xs text-gray-400 mt-5 text-center">
          Only Work Station Office employees can access this system.
        </p>
      </div>
    </div>
  );
}
