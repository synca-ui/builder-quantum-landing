/**
 * Lieferbarkeit der Zusatzfunktionen — EINE Quelle für Konfigurator und
 * beide Renderer.
 *
 * Anlass (Audit 20.08.2026): Der Feature-Schritt bot sechs Zusatzfunktionen
 * an, von denen vier auf der veröffentlichten Seite schlicht nicht
 * existierten:
 *
 *  - Online-Bestellung: Gäste konnten Gerichte in einen Warenkorb legen,
 *    aber es gibt keinen Checkout und keinen Gast-Bestell-Endpunkt
 *    (POST /api/orders/create ist Betreiber-seitig, requireAuth) —
 *    eine Sackgasse mitten im Gast-Erlebnis.
 *  - Online-Shop, Stempelkarte/Treue, Gutscheine: kein einziges Rendering
 *    auf der Live-Seite; die Konfiguration verschwand im Nichts.
 *
 * Ein Betrieb, der so etwas aktiviert, verspricht seinen Gästen etwas,
 * das nicht eingelöst wird. Deshalb: Was hier auf `false` steht, erscheint
 * im Konfigurator als „Bald verfügbar" (nicht aktivierbar) und wird von
 * beiden Renderern nicht ausgespielt. Sobald ein Feature wirklich
 * end-to-end funktioniert, genügt EIN Flag-Wechsel hier.
 */
export const FEATURE_AVAILABILITY: Record<string, boolean> = {
  onlineOrderingEnabled: false, // Warenkorb ohne Kasse — erst mit echtem Checkout
  onlineStoreEnabled: false, // kein Shop-Rendering auf der Live-Seite
  teamAreaEnabled: true, // Über-uns-Seite zeigt das Team
  loyaltyEnabled: false, // keine Stempel-Logik für Gäste
  couponsEnabled: false, // keine Einlöse-Logik für Gäste
  offersEnabled: true, // Angebote-Seite + Startseiten-Banner
};

export function isFeatureDeliverable(featureId: string): boolean {
  return FEATURE_AVAILABILITY[featureId] !== false;
}
