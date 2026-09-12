import type { OpeningHours } from "@/types/domain";

function zuMinuten(zeit: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((zeit ?? "").trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Liegt ein Reservierungs-Zeitfenster an mindestens einem Wochentag in den
 * Öffnungszeiten?
 *
 * Zur Laufzeit filtert `slotsFuerDatum` (@maitr/core) die Slots ohnehin gegen
 * die Öffnungszeiten des jeweiligen Tages. Der Konfigurations-Schritt zeigte
 * dazu aber nichts: Ein aktiviertes 23:00-Fenster bei Ladenschluss 22:00
 * wirkte im Editor, als würde es greifen (Prüfung Runde 8, M5). Diese
 * Funktion liefert dem Editor den Hinweis — grob über alle Tage, weil die
 * Zeitfenster selbst nicht pro Tag konfiguriert werden.
 *
 * Ohne gepflegte Öffnungszeiten gibt es keine Aussage, dann gilt alles als
 * innerhalb.
 */
export function slotInnerhalbOeffnungszeiten(
  slot: string,
  openingHours: OpeningHours | null | undefined,
): boolean {
  const tage = Object.values(openingHours ?? {}).filter(
    (t) => t && !t.closed && t.open && t.close,
  );
  if (tage.length === 0) return true;
  const minuten = zuMinuten(slot);
  if (minuten == null) return true;
  return tage.some((t) => {
    const auf = zuMinuten(t.open);
    let zu = zuMinuten(t.close);
    if (auf == null || zu == null) return false;
    // Über Mitternacht („18:00–02:00“): das Ende liegt am nächsten Tag.
    if (zu <= auf) zu += 24 * 60;
    return minuten >= auf && minuten < zu;
  });
}
