/**
 * Deutsche Anzeigenamen für die Öffnungszeiten-Schlüssel des Stores.
 *
 * Die Öffnungszeiten liegen unter englischen Schlüsseln (monday, tuesday, …).
 * Konfigurator-Vorschau UND veröffentlichte Seite (AppRenderer) zeigten den
 * rohen Schlüssel — deutsche Gäste lasen "Monday, Tuesday, …". Eine Quelle
 * für beide Renderer, damit die Vorschau nie etwas anderes zeigt als die
 * Live-Seite.
 */
export const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};
