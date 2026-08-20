/**
 * Gast-Sicht auf die Stempelkarte — die Seite hinter dem QR/Link, den der
 * Betrieb beim Ausgeben der Karte teilt (`/karte/:cardId?t=<hmac>`).
 *
 * Bewusst eigenständig und leicht (wie ManageReservation unter /r/:id):
 * kein Login, keine App, funktioniert auf jedem Gast-Handy. Zeigt nur, was
 * auch auf einer Pappkarte stünde: Betrieb, Stempel, Ziel, Prämie.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Stamp, Gift, Loader2 } from "lucide-react";

interface GastKarte {
  betriebsName: string;
  stand: number;
  max: number;
  rewardText: string;
  status: string;
}

export default function GastStempelkarte() {
  const { cardId } = useParams<{ cardId: string }>();
  const [params] = useSearchParams();
  const token = params.get("t") || "";

  const [karte, setKarte] = useState<GastKarte | null>(null);
  const [zustand, setZustand] = useState<"laedt" | "ok" | "fehler">("laedt");
  const [wallet, setWallet] = useState<{ apple: boolean; google: boolean }>({
    apple: false,
    google: false,
  });

  useEffect(() => {
    if (!cardId || !token) {
      setZustand("fehler");
      return;
    }
    fetch(
      `/api/public/stampcards/${encodeURIComponent(cardId)}?t=${encodeURIComponent(token)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.karte) {
          setKarte(data.karte);
          if (data.wallet) setWallet(data.wallet);
          setZustand("ok");
        } else {
          setZustand("fehler");
        }
      })
      .catch(() => setZustand("fehler"));
  }, [cardId, token]);

  const voll = !!karte && karte.stand >= karte.max;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {zustand === "laedt" && (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Karte wird geladen …
          </div>
        )}

        {zustand === "fehler" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-gray-900 mb-2">
              Karte nicht gefunden
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Dieser Link ist ungültig oder abgelaufen. Bitte lass dir im
              Betrieb einen neuen QR-Code zeigen.
            </p>
          </div>
        )}

        {zustand === "ok" && karte && (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-lg">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold text-center mb-1">
              Stempelkarte
            </p>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
              {karte.betriebsName}
            </h1>

            {/* Stempel-Raster — gefüllte und leere Punkte wie auf Pappe */}
            <div
              className="grid gap-3 justify-center mb-6"
              style={{
                gridTemplateColumns: `repeat(${Math.min(karte.max, 5)}, 44px)`,
              }}
            >
              {Array.from({ length: karte.max }, (_, i) => (
                <div
                  key={i}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors ${
                    i < karte.stand
                      ? "bg-teal-500 border-teal-500 text-white"
                      : "bg-gray-50 border-dashed border-gray-300 text-gray-300"
                  }`}
                >
                  <Stamp className="w-5 h-5" />
                </div>
              ))}
            </div>

            <p className="text-center text-2xl font-black text-gray-900 mb-1">
              {Math.min(karte.stand, karte.max)}{" "}
              <span className="text-gray-400 font-bold">/ {karte.max}</span>
            </p>

            {karte.status === "REDEEMED" ? (
              <p className="text-center text-sm text-gray-500 mt-4">
                Diese Karte wurde bereits eingelöst — danke für deine Treue!
              </p>
            ) : voll ? (
              <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
                <Gift className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-teal-800">
                  Geschafft! {karte.rewardText || "Deine Prämie wartet."}
                </p>
                <p className="text-xs text-teal-600 mt-1">
                  Zeig diese Karte beim nächsten Besuch vor.
                </p>
              </div>
            ) : (
              karte.rewardText && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  <Gift className="w-4 h-4 inline mr-1 text-gray-400" />
                  {karte.max - karte.stand}{" "}
                  {karte.max - karte.stand === 1 ? "Stempel" : "Stempel"} bis:{" "}
                  <span className="font-medium text-gray-700">
                    {karte.rewardText}
                  </span>
                </p>
              )
            )}
          </div>
        )}

        {zustand === "ok" && karte && (wallet.apple || wallet.google) && (
          <div className="mt-4 space-y-2">
            {wallet.apple && (
              <a
                href={`/api/public/stampcards/${encodeURIComponent(cardId!)}/apple.pkpass?t=${encodeURIComponent(token)}`}
                className="block w-full text-center py-3 rounded-xl bg-black text-white text-sm font-bold"
              >
                 Zu Apple Wallet hinzufügen
              </a>
            )}
            {wallet.google && (
              <a
                href={`/api/public/stampcards/${encodeURIComponent(cardId!)}/google-wallet?t=${encodeURIComponent(token)}`}
                className="block w-full text-center py-3 rounded-xl bg-gray-900 text-white text-sm font-bold"
              >
                In Google Wallet speichern
              </a>
            )}
            <p className="text-center text-xs text-gray-400">
              Der Pass aktualisiert sich nach jedem Stempel von selbst.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Bereitgestellt über{" "}
          <a href="https://www.maitr.de" className="underline">
            Maitr
          </a>
        </p>
      </div>
    </div>
  );
}
