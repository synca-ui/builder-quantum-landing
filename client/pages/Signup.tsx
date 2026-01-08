import { SignUp } from "@clerk/clerk-react";

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg rounded-xl border border-gray-200",
            },
          }}
          afterSignUpUrl="/dashboard"
          signInUrl="/login"
        />
      </div>
    </div>
  );
}
