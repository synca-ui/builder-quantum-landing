import React, { useState, useEffect } from "react";
import { Cookie, ChevronDown, ChevronUp } from "lucide-react";

type ConsentState = {
    necessary: true;
    analytics: boolean;
    decided: boolean;
};

const STORAGE_KEY = "maitr_cookie_consent";
export const COOKIE_SETTINGS_EVENT = "maitr:open-cookie-settings";

export function useConsent(): ConsentState {
    if (typeof window === "undefined") {
        return { necessary: true, analytics: false, decided: false };
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { necessary: true, analytics: false, decided: false };
        return JSON.parse(stored) as ConsentState;
    } catch {
        return { necessary: true, analytics: false, decided: false };
    }
}

export function openCookieSettings() {
    window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT));
}

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            const timer = setTimeout(() => setVisible(true), 600);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        function handleOpen() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const consent = JSON.parse(stored) as ConsentState;
                    setAnalyticsEnabled(consent.analytics);
                }
            } catch { }
            setShowDetails(true);
            setVisible(true);
        }
        window.addEventListener(COOKIE_SETTINGS_EVENT, handleOpen);
        return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, handleOpen);
    }, []);

    function save(analytics: boolean) {
        const consent: ConsentState = { necessary: true, analytics, decided: true };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
        setVisible(false);
        setShowDetails(false);
        // TODO: if (analytics) { initPlausible(); }
    }

    if (!visible) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[9999]" style={{ animation: "fadeIn 0.25s ease" }} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-lg px-4 max-h-[90vh] overflow-y-auto" style={{ animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">

                    <div className="px-5 pt-5 pb-4">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
                                <Cookie className="w-5 h-5 text-teal-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800 text-sm font-display">Deine Cookie-Einstellungen</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Wir verwenden Cookies für den Betrieb der Website. Technisch notwendige Cookies können nicht deaktiviert werden.{" "}
                                    <a href="/datenschutz" className="text-teal-600 hover:text-teal-700 underline underline-offset-2 transition-colors">Datenschutzerklärung</a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {showDetails && (
                        <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-700">
                                        Technisch notwendig
                                        <span className="ml-2 text-xs font-normal text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">Immer aktiv</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Session-Cookies, Authentifizierung (Clerk). Zwingend erforderlich.</p>
                                </div>
                                <div className="w-10 h-5 rounded-full bg-teal-200 flex items-center px-0.5 cursor-not-allowed shrink-0 mt-0.5 opacity-70">
                                    <div className="w-4 h-4 rounded-full bg-teal-600 ml-auto" />
                                </div>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-700">Analytics</p>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Anonyme Nutzungsstatistiken. Aktuell noch nicht aktiv.</p>
                                </div>
                                <button
                                    onClick={() => setAnalyticsEnabled(v => !v)}
                                    aria-label={analyticsEnabled ? "Analytics deaktivieren" : "Analytics aktivieren"}
                                    className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors shrink-0 mt-0.5 ${analyticsEnabled ? "bg-teal-500 justify-end" : "bg-slate-300 justify-start"}`}
                                >
                                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="px-5 pb-5 pt-3 flex flex-col gap-2">
                        {!showDetails ? (
                            <>
                                <div className="flex gap-2">
                                    <button onClick={() => save(true)} className="flex-1 h-9 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors">Alle akzeptieren</button>
                                    <button onClick={() => save(false)} className="flex-1 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors">Nur notwendige</button>
                                </div>
                                <button onClick={() => setShowDetails(true)} className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-teal-600 transition-colors py-1">
                                    Einstellungen anpassen <ChevronDown className="w-3 h-3" />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="flex gap-2">
                                    <button onClick={() => save(analyticsEnabled)} className="flex-1 h-9 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors">Auswahl speichern</button>
                                    <button onClick={() => save(true)} className="flex-1 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors">Alle akzeptieren</button>
                                </div>
                                <button onClick={() => setShowDetails(false)} className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-teal-600 transition-colors py-1">
                                    Weniger anzeigen <ChevronUp className="w-3 h-3" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
        </>
    );
}
