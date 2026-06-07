import { PageSEO } from "@/components/seo/PageSEO";
import { SignIn } from "@clerk/clerk-react";
import { AuthLayout } from "@/components/AuthLayout";

export default function Login() {
  return (
    <AuthLayout mode="login">
      <PageSEO title="Maitr - Anmelden" description="Melde dich bei Maitr an." noindex={true} />
      <SignIn
        routing="path"
        path="/login"
        fallbackRedirectUrl="/"
        signUpUrl="/signup"
        appearance={{
          layout: {
            socialButtonsVariant: "blockButton",
            socialButtonsPlacement: "top",
          },
          variables: {
            colorBackground: "#ffffff",
            colorInputBackground: "#f9f7f4",
            colorText: "#1c1007",
            colorTextSecondary: "#78614a",
            colorInputText: "#1c1007",
            colorPrimary: "#14b8a6",
            borderRadius: "0.875rem",
            fontFamily: "inherit",
          },
          elements: {
            rootBox: "w-full",
            card: [
              "w-full rounded-3xl overflow-hidden",
              "bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25),0_4px_16px_rgba(0,0,0,0.12)]",
              "border border-white/60",
            ].join(" "),
            cardBox: "w-full",
            header: "hidden",
            socialButtonsBlockButton: [
              "rounded-xl font-semibold text-sm h-11",
              "bg-stone-50 border border-stone-200 text-stone-800",
              "hover:bg-stone-100 hover:border-stone-300 transition-colors",
            ].join(" "),
            dividerLine: "bg-stone-200",
            dividerText: "text-stone-400 text-xs",
            formFieldLabel: "text-sm font-semibold text-stone-700",
            formFieldInput: [
              "rounded-xl h-11 text-sm text-stone-900",
              "bg-stone-50 border-stone-200",
              "focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 focus:bg-white",
            ].join(" "),
            formButtonPrimary: [
              "h-11 rounded-xl font-bold text-sm text-white",
              "bg-gradient-to-r from-teal-500 via-purple-500 to-orange-400",
              "hover:from-teal-600 hover:via-purple-600 hover:to-orange-500",
              "shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:scale-[1.01]",
            ].join(" "),
            footerActionText: "text-stone-500 text-sm",
            footerActionLink: "text-teal-600 hover:text-teal-700 font-semibold",
            identityPreviewEditButton: "text-teal-600",
            formResendCodeLink: "text-teal-600 hover:text-teal-700 font-semibold",
          },
        }}
      />
    </AuthLayout>
  );
}
