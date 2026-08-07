/**
 * Macht die Matcher von @testing-library/jest-dom für die Typprüfung bekannt.
 *
 * test/setupTests.ts importiert "@testing-library/jest-dom" — zur Laufzeit
 * funktionieren toBeInTheDocument & Co. deshalb längst. tsc sah davon aber
 * nichts, weil setupTests.ts gar nicht im include von tsconfig.json steht.
 * Ergebnis waren 26 Typfehler in vier Testdateien, die alle dasselbe sagten:
 * "Property 'toBeInTheDocument' does not exist".
 *
 * Solche Fehler sind nicht harmlos: Bei 108 Altfehlern fällt ein echter neuer
 * nicht mehr auf. Diese Datei kostet nichts und nimmt 26 davon weg.
 */
import "@testing-library/jest-dom/vitest";
