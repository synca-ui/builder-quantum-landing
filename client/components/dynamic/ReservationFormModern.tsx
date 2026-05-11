/**
 * ReservationFormModern.tsx
 *
 * Modern tile-based reservation form for restaurant websites.
 * Design: Personen → Datum → Uhrzeit → Kontaktdaten → Bestätigung
 */
import React, { useState, useEffect } from "react";
import { CheckCircle, ChevronLeft, Loader2 } from "lucide-react";

interface Slot {
  time: string;
  datetime: string;
  available: boolean;
}

interface ReservationFormModernProps {
  configId: string;
  businessName: string;
  primaryColor?: string;       // accent color (tiles)
  buttonColor?: string;        // button background color
  textColor?: string;          // text color
  bgColor?: string;            // card background
  buttonTextColor?: string;
  buttonShape?: "rounded" | "pill" | "square";
  maxGuests?: number;
}

type Step = "select" | "contact" | "success";

export default function ReservationFormModern({
  configId,
  businessName,
  primaryColor = "#14b8a6",
  buttonColor = "#111827",
  textColor = "#111827",
  bgColor = "#FAFAF8",
  buttonTextColor = "#ffffff",
  buttonShape = "rounded",
  maxGuests = 10,
}: ReservationFormModernProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("select");
  const [guestCount, setGuestCount] = useState<number>(2);
  const [selectedDateISO, setSelectedDateISO] = useState<string>(""); // YYYY-MM-DD
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    specialRequests: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Date helpers ───────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  function formatDate(d: Date): string {
    if (d.getTime() === today.getTime()) return "Heute";
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.getTime() === tomorrow.getTime()) return "Morgen";
    return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  }

  function toISO(d: Date): string {
    return d.toISOString().split("T")[0];
  }

  // ── Init: set today as default ─────────────────────────────────────────────
  useEffect(() => {
    setSelectedDateISO(toISO(today));
  }, []);

  // ── Fetch slots when date changes ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedDateISO || !configId) return;
    setSelectedSlot(null);
    setLoadingSlots(true);
    fetch(`/api/public/reservations/slots?configId=${encodeURIComponent(configId)}&date=${selectedDateISO}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSlots(data.slots);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDateISO, configId]);

  // ── Guest count pill options ───────────────────────────────────────────────
  const guestOptions = Array.from({ length: Math.min(maxGuests, 4) }, (_, i) => i + 1);
  const showPlus = maxGuests > 4;

  // ── Button border radius ───────────────────────────────────────────────────
  const btnRadius =
    buttonShape === "pill" ? "9999px" : buttonShape === "square" ? "4px" : "10px";
  const tileRadius = "10px";

  // ── Styles ─────────────────────────────────────────────────────────────────
  const pill = (active: boolean) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 18px",
    borderRadius: tileRadius,
    border: `2px solid ${active ? primaryColor : "#E5E7EB"}`,
    backgroundColor: active ? primaryColor : "#fff",
    color: active ? buttonTextColor : textColor,
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    minWidth: "60px",
  } as React.CSSProperties);

  const timePill = (slot: Slot) => ({
    ...pill(selectedSlot?.time === slot.time),
    opacity: slot.available ? 1 : 0.35,
    cursor: slot.available ? "pointer" : "not-allowed",
    padding: "12px 20px",
  } as React.CSSProperties);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.guestName.trim()) { setError("Bitte gib deinen Namen ein."); return; }
    if (!selectedSlot) { setError("Bitte wähle eine Uhrzeit."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId,
          guestName: form.guestName,
          guestEmail: form.guestEmail || undefined,
          guestPhone: form.guestPhone || undefined,
          guestCount,
          reservationTime: selectedSlot.datetime,
          specialRequests: form.specialRequests || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Fehler");
      setStep("success");
    } catch (e: any) {
      setError(e.message || "Ein Fehler ist aufgetreten. Bitte versuche es nochmal.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: Success ────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div style={{ backgroundColor: bgColor, borderRadius: "16px", padding: "32px 24px", textAlign: "center", color: textColor }}>
        <CheckCircle style={{ width: 56, height: 56, margin: "0 auto 16px", color: primaryColor }} />
        <h2 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 8px" }}>Anfrage gesendet!</h2>
        <p style={{ color: "#6B7280", fontSize: "15px", marginBottom: "24px" }}>
          Wir haben deine Reservierungsanfrage erhalten und melden uns bald.
          {form.guestEmail && " Eine Bestätigung wurde an deine E-Mail-Adresse gesendet."}
        </p>
        <div style={{ backgroundColor: "#F3F4F6", borderRadius: "10px", padding: "16px", textAlign: "left", marginBottom: "24px" }}>
          <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Gast:</strong> {form.guestName}</p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Personen:</strong> {guestCount}</p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Datum:</strong> {selectedDateISO}</p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Uhrzeit:</strong> {selectedSlot?.time} Uhr</p>
        </div>
        <button
          onClick={() => { setStep("select"); setSelectedSlot(null); setForm({ guestName: "", guestEmail: "", guestPhone: "", specialRequests: "" }); }}
          style={{ backgroundColor: buttonColor, color: buttonTextColor, border: "none", borderRadius: btnRadius, padding: "14px 28px", fontWeight: "700", fontSize: "16px", cursor: "pointer", width: "100%" }}
        >
          Neue Reservierung
        </button>
      </div>
    );
  }

  // ── Render: Contact step ───────────────────────────────────────────────────
  if (step === "contact") {
    return (
      <div style={{ backgroundColor: bgColor, borderRadius: "16px", padding: "24px", color: textColor }}>
        <button
          onClick={() => setStep("select")}
          style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", marginBottom: "20px", padding: 0 }}
        >
          <ChevronLeft size={16} /> Zurück
        </button>

        <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 4px" }}>Deine Daten</h2>
        <p style={{ color: "#6B7280", fontSize: "14px", margin: "0 0 24px" }}>
          {guestCount} Personen · {selectedDateISO} · {selectedSlot?.time} Uhr
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {[
            { key: "guestName", label: "Name *", placeholder: "Max Mustermann", type: "text" },
            { key: "guestEmail", label: "E-Mail", placeholder: "max@beispiel.de", type: "email" },
            { key: "guestPhone", label: "Telefon", placeholder: "+49 ....", type: "tel" },
            { key: "specialRequests", label: "Sonderwünsche", placeholder: "z.B. Fensterplatz, Allergien", type: "text" },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", color: "#6B7280", marginBottom: "6px", textTransform: "uppercase" }}>
                {label}
              </label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "15px", color: textColor, backgroundColor: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          ))}
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "12px" }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ marginTop: "24px", backgroundColor: buttonColor, color: buttonTextColor, border: "none", borderRadius: btnRadius, padding: "16px 28px", fontWeight: "700", fontSize: "16px", cursor: submitting ? "not-allowed" : "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: submitting ? 0.7 : 1 }}
        >
          {submitting && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
          Tisch anfragen
        </button>
      </div>
    );
  }

  // ── Render: Selection step ─────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: bgColor, borderRadius: "16px", padding: "24px", color: textColor }}>
      <h2 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 24px" }}>Tisch reservieren</h2>

      {/* Personen */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", color: "#6B7280", textTransform: "uppercase", marginBottom: "10px" }}>Personen</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {guestOptions.map((n) => (
            <button key={n} onClick={() => setGuestCount(n)} style={pill(guestCount === n)}>{n}</button>
          ))}
          {showPlus && (
            <button onClick={() => setGuestCount(5)} style={pill(guestCount >= 5)}>5+</button>
          )}
        </div>
      </div>

      {/* Datum */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", color: "#6B7280", textTransform: "uppercase", marginBottom: "10px" }}>Datum</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {dateOptions.map((d) => {
            const iso = toISO(d);
            return (
              <button key={iso} onClick={() => setSelectedDateISO(iso)} style={pill(selectedDateISO === iso)}>
                {formatDate(d)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Uhrzeit */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", color: "#6B7280", textTransform: "uppercase", marginBottom: "10px" }}>Uhrzeit</p>
        {loadingSlots ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Lade Zeiten...
          </div>
        ) : slots.length === 0 ? (
          <p style={{ color: "#9CA3AF", fontSize: "14px" }}>Keine Zeitslots verfügbar.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {slots.map((slot) => (
              <button
                key={slot.time}
                disabled={!slot.available}
                onClick={() => slot.available && setSelectedSlot(slot)}
                style={timePill(slot)}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => selectedSlot && setStep("contact")}
        disabled={!selectedSlot}
        style={{ backgroundColor: selectedSlot ? buttonColor : "#E5E7EB", color: selectedSlot ? buttonTextColor : "#9CA3AF", border: "none", borderRadius: btnRadius, padding: "16px 28px", fontWeight: "700", fontSize: "16px", cursor: selectedSlot ? "pointer" : "not-allowed", width: "100%", transition: "all 0.2s ease" }}
      >
        Tisch anfragen
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
