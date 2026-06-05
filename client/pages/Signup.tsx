import { PageSEO } from "@/components/seo/PageSEO";
import { SignUp } from "@clerk/clerk-react";
import { AuthLayout } from "@/components/AuthLayout";

export default function Signup() {
  return (
    <AuthLayout mode="signup">
      <PageSEO title="Maitr - Konto erstellen" description="Erstelle dein kostenloses Maitr-Konto." noindex={true} />
      <SignUp
        routing="path"
        path="/signup"
        fallbackRedirectUrl="/"
        signInUrl="/login"
        appearance={{
          layout: {
            socialButtonsVariant: "blockButton",
            socialButtonsPlacement: "top",
          },
          elements: {
            rootBox: "w-full",
            card: "w-full shadow-none border-0 bg-transparent p-0",
            header: "hidden", // Hide the Clerk header since we have our own in AuthLayout!
            headerTitle: "text-xl font-black text-gray-900",
            headerSubtitle: "text-sm text-gray-500",
            socialButtonsBlockButton: [
              "border border-gray-200 rounded-xl font-semibold text-sm h-11",
              "hover:border-teal-400 hover:bg-teal-50 transition-colors",
            ].join(" "),
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-400 text-xs",
            formFieldLabel: "text-sm font-semibold text-gray-700",
            formFieldInput: [
              "rounded-xl border-gray-200 h-11 text-sm",
              "focus:ring-2 focus:ring-teal-400 focus:border-transparent",
            ].join(" "),
            formButtonPrimary: [
              "h-11 rounded-xl font-bold text-sm",
              "bg-gradient-to-r from-teal-500 via-purple-500 to-orange-400",
              "hover:from-teal-600 hover:via-purple-600 hover:to-orange-500",
              "shadow-lg shadow-teal-500/25 transition-all hover:shadow-teal-500/40 hover:scale-[1.01]",
            ].join(" "),
            footerActionText: "text-gray-500 text-sm",
            footerActionLink: "text-teal-600 hover:text-teal-700 font-semibold",
            identityPreviewEditButton: "text-teal-600",
            formResendCodeLink: "text-teal-600 hover:text-teal-700 font-semibold",
          },
        }}
      />
    </AuthLayout>
  );
}
