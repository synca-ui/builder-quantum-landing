/**
 * Formatprüfung für eine eigene Domain (Schritt „Domain & Hosting“).
 *
 * Anlass: Der Knopf „Prüfen“ neben der eigenen Domain meldete für JEDE
 * nicht-leere Eingabe „ist bereit zur Verbindung!“ — auch für „asdf“. Das ist
 * ein Versprechen, das niemand eingelöst hat: Es gibt keinen Endpunkt, der
 * Besitz oder DNS einer fremden Domain prüft (server/routes/subdomains.ts
 * prüft ausschließlich *.maitr.de-Subdomains).
 *
 * Diese Funktion prüft deshalb NUR die Schreibweise — mehr kann der Browser
 * ohne DNS-Abfrage nicht wissen. Die Oberfläche muss entsprechend vorsichtig
 * formulieren: „Format sieht gültig aus“, nicht „bereit“.
 *
 * Umlaut-Domains (münster-café.de) sind gültige Hostnamen und werden bewusst
 * akzeptiert; die Regex arbeitet darum auf Unicode-Buchstaben statt auf a-z.
 */

/**
 * Flaches Ergebnis statt unterschiedener Union: Das Projekt kompiliert mit
 * `strictNullChecks: false`, dort verengt TypeScript eine Union über `ok`
 * nicht — `ergebnis.grund` wäre im Fehlerzweig ein Typfehler.
 */
export interface DomainFormatErgebnis {
  ok: boolean;
  /** Gesetzt bei ok: die bereinigte, kleingeschriebene Domain. */
  domain?: string;
  /** Gesetzt bei Fehlern: der Grund in einem Satz, direkt anzeigbar. */
  grund?: string;
}

/** Ein Label: beginnt und endet alphanumerisch, Bindestriche nur innen. */
const LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;
/** Endung: reine Buchstaben, mindestens zwei (de, com, berlin …). */
const TLD = /^\p{L}{2,}$/u;

export function pruefeDomainFormat(eingabe: string): DomainFormatErgebnis {
  const roh = (eingabe ?? "").trim();

  if (!roh) {
    return { ok: false, grund: "Bitte gib zuerst eine Domain ein." };
  }

  if (/\s/.test(roh)) {
    return {
      ok: false,
      grund: "Eine Domain enthält keine Leerzeichen.",
    };
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(roh)) {
    return {
      ok: false,
      grund: "Bitte ohne https:// eingeben — nur den Domainnamen.",
    };
  }

  if (/[/?#@:]/.test(roh)) {
    return {
      ok: false,
      grund:
        "Bitte nur den Domainnamen eingeben, ohne Pfad, Port oder Parameter.",
    };
  }

  // Ein abschließender Punkt ist technisch erlaubt (Root-Label), für die
  // Eingabe hier aber nur Tippfehler-Rauschen.
  const domain = roh.replace(/\.$/, "").toLowerCase();

  if (domain.length > 253) {
    return { ok: false, grund: "Diese Domain ist zu lang." };
  }

  const labels = domain.split(".");

  if (labels.length < 2) {
    return {
      ok: false,
      grund: "Eine Domain braucht eine Endung, zum Beispiel mein-café.de.",
    };
  }

  if (!labels.every((label) => LABEL.test(label))) {
    return {
      ok: false,
      grund:
        "Diese Schreibweise ergibt keine gültige Domain. Erlaubt sind Buchstaben, Ziffern und Bindestriche (nicht am Anfang oder Ende).",
    };
  }

  if (!TLD.test(labels[labels.length - 1])) {
    return {
      ok: false,
      grund: "Die Endung sieht nicht gültig aus, zum Beispiel .de oder .com.",
    };
  }

  return { ok: true, domain };
}
