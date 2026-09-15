/**
 * Shared ReservationClassicForm
 *
 * Die klassische Reservierungsseite — EIN Markup für Vorschau
 * (TemplatePreviewContent) und veröffentlichte Seite (AppRenderer), und seit
 * 10.09.2026 auch funktional: Bis dahin war der Knopf „Reservierung anfragen“
 * in beiden Renderern eine Attrappe ohne Aktion; buchen konnte nur der
 * Formularstil „modern“. Jetzt laufen beide über denselben Datenfluss:
 *   - Zeitfenster: /api/public/reservations/slots (live) bzw. die Slots aus
 *     dem Store durch dieselbe Öffnungszeiten-Logik wie der Server (Vorschau)
 *   - Absenden: POST /api/public/reservations mit demselben Payload wie
 *     ReservationFormModern; in der Vorschau ohne Netz mit Erfolgsansicht
 *
 * Rundungen kommen aus den Design-Tokens des Templates (styleInjector.ts):
 * Karte --radius-card, Felder --radius-input, Knopf nach gewählter Form.
 */
import React, { memo, useEffect, useState } from "react";
import { Calendar, CalendarCheck, CheckCircle, Clock, Loader2, Phone, User, Users } from "lucide-react";
import { slotsFuerDatum } from "@maitr/core/reservierungsSlots";
import type { OpeningHours } from "@maitr/core/types";
import { lokalesDatumISO, STANDARD_ZONE, zeitpunktAusDatumUndUhrzeit } from "@maitr/core/zeitzone";
import type { ReservationShape } from "@/components/ui/ReservationButton";

interface Slot {
  time: string;
  datetime: string;
  available: boolean;
}

export interface ReservationClassicFormProps {
  /** ID der veröffentlichten Konfiguration — leer in der Vorschau. */
  configId?: string;
  /** Vorschau: Zeitfenster aus dem Store statt vom Server; das Absenden bleibt lokal. */
  previewSlots?: string[];
  previewOpeningHours?: OpeningHours;
  maxGuests?: number;
  primaryColor: string;
  fontColor: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonShape?: ReservationShape;
  /** Stil des Seitentitels (Display-Schrift der Papier-Templates). */
  titleStyle?: React.CSSProperties;
}

// Lokaler Kalendertag des Gastes. ANLASS (15.09.2026): Hier stand
// `toISOString().split("T")[0]` auf der lokalen Mitternacht - in Berlin der
// Vortag, als Vorgabe UND als `min` des Datumsfelds.
function heuteISO(): string {
  return lokalesDatumISO(new Date());
}

export const ReservationClassicForm = memo(function ReservationClassicForm({
  configId = "",
  previewSlots,
  previewOpeningHours,
  maxGuests = 10,
  primaryColor,
  fontColor,
  buttonColor,
  buttonTextColor,
  buttonShape = "rounded",
  titleStyle,
}: ReservationClassicFormProps) {
  const vorschau = Array.isArray(previewSlots);
  const [datum, setDatum] = useState(heuteISO);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [ladeSlots, setLadeSlots] = useState(false);
  const [zeit, setZeit] = useState("");
  const [gaeste, setGaeste] = useState(2);
  const [name, setName] = useState("");
  const [kontakt, setKontakt] = useState("");
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState(false);

  // Zeitfenster für das gewählte Datum — dieselbe Quelle wie das „modern“-Formular.
  useEffect(() => {
    setZeit("");
    if (!datum) return;
    if (vorschau) {
      const gefiltert = slotsFuerDatum(previewSlots!, previewOpeningHours ?? null, datum);
      // Dieselben Zeitpunkte wie GET /slots (Wanduhr in Europe/Berlin), nicht
      // `${datum}T19:00:00.000Z` - Vorschau und Server rechnen gleich.
      setSlots(
        gefiltert.flatMap((time) => {
          const zeitpunkt = zeitpunktAusDatumUndUhrzeit(datum, time, STANDARD_ZONE);
          return zeitpunkt ? [{ time, datetime: zeitpunkt.toISOString(), available: true }] : [];
        }),
      );
      return;
    }
    if (!configId) {
      setSlots([]);
      return;
    }
    setLadeSlots(true);
    fetch(`/api/public/reservations/slots?configId=${encodeURIComponent(configId)}&date=${datum}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.success ? data.slots : []))
      .catch(() => setSlots([]))
      .finally(() => setLadeSlots(false));
  }, [datum, configId, vorschau, previewSlots, previewOpeningHours]);

  const gewaehlt = slots.find((s) => s.time === zeit) ?? null;

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setFehler("Bitte gib deinen Namen ein.");
    if (!gewaehlt) return setFehler("Bitte wähle eine Uhrzeit.");
    setFehler(null);
    // Vorschau: kein Netz, keine Konfiguration — nur zeigen, was der Gast sieht.
    if (vorschau || !configId) {
      setGesendet(true);
      return;
    }
    setSendet(true);
    try {
      const istMail = kontakt.includes("@");
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId,
          guestName: name.trim(),
          guestEmail: istMail ? kontakt.trim() : undefined,
          guestPhone: !istMail && kontakt.trim() ? kontakt.trim() : undefined,
          guestCount: gaeste,
          reservationTime: gewaehlt.datetime,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Fehler");
      setGesendet(true);
    } catch (err: any) {
      setFehler(err?.message || "Ein Fehler ist aufgetreten. Bitte versuche es nochmal.");
    } finally {
      setSendet(false);
    }
  }

  const knopfRadius =
    buttonShape === "pill" ? "9999px" : buttonShape === "square" ? "0px" : "var(--radius-button, 12px)";
  const feld: React.CSSProperties = { borderRadius: "var(--radius-input, 12px)", color: fontColor };
  const feldKlasse = "flex items-center gap-2 md:gap-3 p-3 md:p-4 border border-current/10 bg-white/50";
  const eingabe = "flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base";
  const kopf = (
    <div className="text-center">
      <div
        className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}20` }}
      >
        {gesendet ? (
          <CheckCircle className="w-8 h-8 md:w-10 md:h-10" style={{ color: primaryColor }} />
        ) : (
          <CalendarCheck className="w-8 h-8 md:w-10 md:h-10" style={{ color: primaryColor }} />
        )}
      </div>
      <h2 className="text-3xl md:text-5xl font-bold mb-2 md:mb-6 text-center leading-tight" style={titleStyle}>
        {gesendet ? "Anfrage gesendet" : "Reservierung"}
      </h2>
      <p className="text-sm md:text-base opacity-70 leading-relaxed">
        {gesendet ? `${gaeste} ${gaeste === 1 ? "Person" : "Personen"} · ${datum} · ${zeit} Uhr` : "Buchen Sie Ihren Tisch online"}
      </p>
    </div>
  );

  if (gesendet) {
    return (
      <div
        className="space-y-6 md:space-y-10 animate-in fade-in duration-300 max-w-2xl mx-auto"
        data-reservation-form="classic"
        data-state="gesendet"
        style={{ color: fontColor }}
      >
        {kopf}
        <div
          className="p-4 md:p-8 border border-current/10 bg-white/5 text-center text-sm md:text-base"
          style={{ borderRadius: "var(--radius-card, 16px)" }}
        >
          Wir melden uns, sobald der Tisch bestätigt ist.
        </div>
        <button
          type="button"
          onClick={() => {
            setGesendet(false);
            setName("");
            setKontakt("");
          }}
          className="w-full py-3 md:py-4 font-bold text-base md:text-lg transition-transform active:scale-[0.98]"
          style={{ border: `1.5px solid ${fontColor}`, color: fontColor, borderRadius: knopfRadius }}
        >
          Neue Reservierung
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-6 md:space-y-10 animate-in fade-in duration-300 max-w-2xl mx-auto"
      data-reservation-form="classic"
      style={{ color: fontColor }}
      onSubmit={absenden}
      noValidate
    >
      {kopf}

      <div
        className="space-y-4 md:space-y-5 p-4 md:p-8 border border-current/10 bg-white/5"
        style={{ borderRadius: "var(--radius-card, 16px)" }}
      >
        <div>
          <label htmlFor="res-datum" className="block text-xs md:text-sm font-bold mb-2 opacity-70">
            Datum
          </label>
          <div className={feldKlasse} style={feld}>
            <Calendar className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
            <input
              id="res-datum"
              type="date"
              className={eingabe}
              value={datum}
              min={heuteISO()}
              onChange={(e) => setDatum(e.target.value)}
              style={{ color: fontColor }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="res-zeit" className="block text-xs md:text-sm font-bold mb-2 opacity-70">
            Uhrzeit
          </label>
          <div className={feldKlasse} style={feld}>
            {ladeSlots ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 opacity-50 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
            )}
            <select
              id="res-zeit"
              className={eingabe}
              value={zeit}
              onChange={(e) => setZeit(e.target.value)}
              style={{ color: fontColor }}
            >
              <option value="">{ladeSlots ? "Lade Zeiten…" : slots.length ? "Zeit wählen…" : "Keine Zeiten verfügbar"}</option>
              {slots.map((s) => (
                <option key={s.time} value={s.time} disabled={!s.available}>
                  {s.time} Uhr
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="res-gaeste" className="block text-xs md:text-sm font-bold mb-2 opacity-70">
            Anzahl Gäste
          </label>
          <div className={feldKlasse} style={feld}>
            <Users className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
            <select
              id="res-gaeste"
              className={eingabe}
              value={gaeste}
              onChange={(e) => setGaeste(Number(e.target.value))}
              style={{ color: fontColor }}
            >
              {Array.from({ length: Math.max(1, maxGuests) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Person" : "Personen"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="res-name" className="block text-xs md:text-sm font-bold mb-2 opacity-70">
            Name
          </label>
          <div className={feldKlasse} style={feld}>
            <User className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
            <input
              id="res-name"
              type="text"
              className={eingabe}
              placeholder="Ihr Name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              style={{ color: fontColor }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="res-kontakt" className="block text-xs md:text-sm font-bold mb-2 opacity-70">
            Telefon / E-Mail
          </label>
          <div className={feldKlasse} style={feld}>
            <Phone className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
            <input
              id="res-kontakt"
              type="text"
              className={eingabe}
              placeholder="Kontakt für Bestätigung..."
              value={kontakt}
              onChange={(e) => setKontakt(e.target.value)}
              autoComplete="email"
              style={{ color: fontColor }}
            />
          </div>
        </div>
      </div>

      {fehler && (
        <p role="alert" className="text-sm text-center" style={{ color: "#B91C1C" }}>
          {fehler}
        </p>
      )}

      <button
        type="submit"
        disabled={sendet}
        className="w-full py-3 md:py-4 font-bold text-base md:text-lg shadow-lg transition-transform active:scale-[0.98] hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2"
        style={{
          // Rückfall auf die Markenfarbe — seit der Server keine Ersatzfarbe
          // mehr unterschiebt, wäre der Knopf sonst durchsichtig.
          backgroundColor: buttonColor || primaryColor,
          color: buttonTextColor || "#FFFFFF",
          borderRadius: knopfRadius,
        }}
      >
        {sendet && <Loader2 className="w-4 h-4 animate-spin" />}
        Reservierung anfragen
      </button>

      <div className="text-center opacity-60 text-xs md:text-sm space-y-1">
        <p>Sie erhalten eine Bestätigung per E-Mail</p>
        <p className="flex items-center justify-center gap-1">
          <Phone className="w-3 h-3 md:w-4 md:h-4" />
          Oder rufen Sie uns an
        </p>
      </div>
    </form>
  );
});

export default ReservationClassicForm;
