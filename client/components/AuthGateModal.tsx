import { SignIn } from "@clerk/clerk-react";
import { X, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthGateModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when user closes or clicks "escape" button */
  onClose: () => void;
  /**
   * Called when the user explicitly wants to skip login and continue anyway.
   * If not provided the escape button is hidden.
   */
  onContinueWithout?: () => void;
  /** Label for the escape button — defaults to "Ich will noch nicht live gehen" */
  continueWithoutLabel?: string;
  /** Contextual headline shown above the Clerk sign-in widget */
  headline?: string;
  /** Contextual sub-copy */
  subline?: string;
  /** Where Clerk should redirect after a successful sign-in */
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
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => {
        // close on backdrop click
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Blurred / dark background */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-7 pb-4 text-center border-b border-gray-100">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-200">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{headline}</h2>
          <p className="mt-1 text-sm text-gray-500 leading-relaxed">{subline}</p>
        </div>

        {/* Clerk SignIn – embedded (no redirect, inline card) */}
        <div className="px-4 pt-4 pb-2 flex justify-center">
          <SignIn
            routing="virtual"
            fallbackRedirectUrl={redirectUrl ?? window.location.pathname}
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-gray-200 rounded-lg font-medium text-sm",
                formButtonPrimary:
                  "bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 rounded-lg font-bold",
                footerActionText: "text-gray-500 text-xs",
                footerActionLink:
                  "text-teal-600 hover:text-teal-700 font-semibold text-xs",
              },
            }}
          />
        </div>

        {/* Escape hatch */}
        {onContinueWithout && (
          <div className="px-6 pb-6 pt-2 flex flex-col items-center gap-2">
            <div className="w-full border-t border-gray-100 mb-3" />
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
