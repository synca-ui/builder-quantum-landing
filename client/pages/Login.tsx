import { PageSEO } from "@/components/seo/PageSEO";
import { SignIn } from "@clerk/clerk-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <PageSEO title="Maitr - Login" description="Melde dich bei Maitr an." noindex={true} />

      <div className="w-full max-w-sm">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg rounded-xl border border-gray-200",
            },
          }}
          fallbackRedirectUrl="/"
          signUpUrl="/signup"
        />
      </div>
    </div>
  );
}
