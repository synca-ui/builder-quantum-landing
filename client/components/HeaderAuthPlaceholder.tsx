/**
 * Der Platz, den der Anmeldeknopf im Kopf der Startseite einnimmt, solange
 * Clerk noch nicht geladen ist.
 *
 * WARUM eine eigene Datei und nicht ein zweiter Export in HeaderAuth.tsx:
 * HeaderAuth.tsx importiert @clerk/clerk-react statisch. Würde die Startseite
 * den Platzhalter von dort holen, läge Clerk über diesen Import wieder im
 * Startbündel — also genau der Zustand, den die Aufteilung vermeiden soll.
 * Diese Datei kennt Clerk nicht und darf deshalb statisch importiert werden.
 *
 * Die Maße hier und die des Avatars in HeaderAuth.tsx müssen gleich bleiben,
 * sonst springt der Kopf, sobald Clerk fertig ist.
 */
import { User } from "lucide-react";

/** Gemeinsame Maße mit dem Avatar in HeaderAuth.tsx. */
// shrink-0, weil der Knopf in zwei Flex-Zeilen steht: ohne das drückt der
// Kopf den Kreis auf 18px zusammen und aus dem Icon wird ein Oval.
export const HEADER_AUTH_SLOT = "w-9 h-9 shrink-0 rounded-full";

export function HeaderAuthPlaceholder({ label = "Anmelden" }: { label?: string }) {
  return (
    <a
      href="/login"
      aria-label={label}
      title={label}
      className={`${HEADER_AUTH_SLOT} flex items-center justify-center border border-gray-200/80 bg-white/60 text-gray-500 transition-colors hover:text-teal-600 hover:border-teal-300`}
    >
      <User className="w-4 h-4" aria-hidden="true" />
    </a>
  );
}

export default HeaderAuthPlaceholder;
