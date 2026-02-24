import React from "react";
import { ClerkProvider, SignIn, SignUp } from "@clerk/clerk-react";
import { X } from "lucide-react";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface LazyClerkModalProps {
    mode: "signIn" | "signUp";
    onClose: () => void;
}

export default function LazyClerkModal({ mode, onClose }: LazyClerkModalProps) {
    return (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
            <div
                className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            >
                <div
                    className="relative animate-in zoom-in-95 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        aria-label="Schließen"
                        className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {mode === "signIn" ? (
                            <SignIn routing="virtual" />
                        ) : (
                            <SignUp routing="virtual" />
                        )}
                    </div>
                </div>
            </div>
        </ClerkProvider>
    );
}
