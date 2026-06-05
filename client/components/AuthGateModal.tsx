import { SignIn } from "@clerk/clerk-react";
import { X, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
  onContinueWithout?: () => void;
  continueWithoutLabel?: string;
  headline?: string;
  subline?: string;
  redirectUrl?: string;
}

export function AuthGateModal({
  open,
  onClose,
  onContinueWithout,
  continueWithoutLabel = "Ich will noch nicht live gehen",
  headline = "Anmelden um fortzufahren",
  subline = "Erstelle ein kostenloses Konto oder melde dich an, um das volle Erlebnis zu genießen.",
  redirectUrl,
}: AuthGateModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-12 pb-6 px-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card – wide enough for Clerk, no overflow-hidden so nothing clips */}
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-5 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{headline}</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
            {subline}
          </p>
        </div>

        {/* Clerk SignIn – full width, no padding squishing */}
        <div className="px-6 pb-4">
          <SignIn
            routing="virtual"
            fallbackRedirectUrl={redirectUrl ?? window.location.pathname}
            appearance={{
              layout: {
                socialButtonsVariant: "blockButton",
              },
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-gray-100 rounded-xl w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-gray-200 rounded-lg font-medium text-sm h-10",
                formButtonPrimary:
                  "bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 rounded-lg font-bold h-10",
                formFieldInput: "rounded-lg border-gray-200 h-10 text-sm",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-400 text-xs",
                footerActionText: "text-gray-500 text-xs",
                footerActionLink:
                  "text-teal-600 hover:text-teal-700 font-semibold text-xs",
              },
            }}
          />
        </div>

        {/* Escape hatch */}
        {onContinueWithout && (
          <div className="px-8 pb-6 pt-1 flex flex-col items-center">
            <div className="w-full border-t border-gray-100 mb-4" />
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600 text-xs font-medium gap-1.5"
              onClick={onContinueWithout}
            >
              {continueWithoutLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
