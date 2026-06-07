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
          elements: {
            rootBox: "w-full",
            card: [
              "w-full rounded-3xl p-6",
              "bg-white/20 backdrop-blur-2xl",
              "border border-white/30",
              "shadow-[0_8px_40px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.50)]",
            ].join(" "),
            cardBox: "w-full",
            header: "hidden",
            socialButtonsBlockButton: [
              "rounded-xl font-semibold text-sm h-11",
              "bg-white/50 border border-white/70 text-amber-900",
              "hover:bg-white/80 transition-colors backdrop-blur-sm",
            ].join(" "),
            dividerLine: "bg-amber-900/15",
            dividerText: "text-amber-900/40 text-xs",
            formFieldLabel: "text-sm font-semibold text-amber-900/80",
            formFieldInput: [
              "rounded-xl h-11 text-sm text-amber-900",
              "bg-white/60 border-white/70 backdrop-blur-sm",
              "focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 focus:bg-white/80",
              "placeholder:text-amber-900/30",
            ].join(" "),
            formButtonPrimary: [
              "h-11 rounded-xl font-bold text-sm text-white",
              "bg-gradient-to-r from-teal-500 via-purple-500 to-orange-400",
              "hover:from-teal-600 hover:via-purple-600 hover:to-orange-500",
              "shadow-lg shadow-teal-500/30 transition-all hover:shadow-teal-500/50 hover:scale-[1.01]",
            ].join(" "),
            footerActionText: "text-amber-900/55 text-sm",
            footerActionLink: "text-amber-700 hover:text-amber-900 font-semibold",
            identityPreviewEditButton: "text-amber-700",
            formResendCodeLink: "text-amber-700 hover:text-amber-900 font-semibold",
          },
        }}
      />
    </AuthLayout>
  );
}
