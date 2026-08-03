/**
 * Zeitgeber für syncAll.
 *
 * syncAll (sync.ts:135) ist als Cron-Einstieg geschrieben, hatte aber bis hierher
 * keinen Aufrufer — die Bewertungen und Reichweitenwerte wären also nie
 * abgeholt worden, egal wie viele Verbindungen bestehen.
 *
 * BEWUSST STANDARDMÄSSIG AUS. Der Zeitgeber läuft nur, wenn
 * MAITR_SYNC_INTERVAL_MINUTES gesetzt ist. Grund: Zum Zeitpunkt der Einführung
 * ist weder die Migration eingespielt noch sind die MAITR_*-Variablen gesetzt.
 * Ein Zeitgeber, der von selbst anspringt, würde im Minutentakt gegen fehlende
 * Tabellen laufen und das Protokoll fluten — und sobald echte Verbindungen
 * bestehen, gingen ungefragt Anfragen an Google und Meta hinaus. Einschalten
 * soll eine Entscheidung sein, kein Nebeneffekt eines Deploys.
 *
 * Kein Cron-Paket, nur setInterval: Es gibt im Projekt keine Cron-Infrastruktur
 * (weder Netlify Scheduled Functions noch einen Railway-Cron), und eine
 * Abhängigkeit für einen einzigen Zeitgeber wäre unverhältnismässig.
 *
 * WAS DAS NICHT LEISTET: Läuft die API in mehreren Instanzen, tickt der
 * Zeitgeber in jeder — die Läufe überlappen dann zwischen den Prozessen, und
 * die Sperre unten hilft nur innerhalb eines Prozesses. Solange genau eine
 * Railway-Instanz läuft, ist das unkritisch. Bei Skalierung gehört der Aufruf
 * nach aussen, etwa als geschützte Route, die ein echter Cron anstösst.
 */
import { syncAll } from "./sync";

/** Kleinster sinnvoller Abstand. Darunter treibt man nur die Fremd-Kontingente hoch. */
const MIN_MINUTES = 5;

let timer: NodeJS.Timeout | null = null;
/** Verhindert, dass ein langsamer Lauf vom nächsten Tick überholt wird. */
let running = false;

async function tick(): Promise<void> {
  if (running) {
    console.warn("[maitr] Zeitgeber: vorheriger Lauf noch aktiv, dieser Tick entfällt");
    return;
  }
  running = true;
  const started = Date.now();
  try {
    await syncAll();
    console.log(`[maitr] Zeitgeber: Lauf fertig in ${Date.now() - started} ms`);
  } catch (err) {
    // Fehlende Tabellen (Migration nicht eingespielt) und fehlende
    // MAITR_*-Variablen landen beide hier. syncAll faengt bereits je Verbindung
    // ab; was bis hierher durchkommt, betrifft den ganzen Lauf. Nur melden,
    // niemals den Prozess mitreissen — die uebrige API haengt daran.
    console.error("[maitr] Zeitgeber: Lauf fehlgeschlagen:", (err as Error).message);
  } finally {
    running = false;
  }
}

/**
 * Startet den Zeitgeber, wenn MAITR_SYNC_INTERVAL_MINUTES gesetzt und gueltig ist.
 * Gibt die gewaehlte Taktung in Minuten zurueck, oder null, wenn nichts laeuft.
 */
export function startMaitrScheduler(): number | null {
  const raw = process.env.MAITR_SYNC_INTERVAL_MINUTES;
  if (!raw) return null;

  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes < MIN_MINUTES) {
    console.warn(
      `[maitr] Zeitgeber NICHT gestartet: MAITR_SYNC_INTERVAL_MINUTES="${raw}" ist ungültig ` +
        `(erwartet eine Zahl ab ${MIN_MINUTES}).`,
    );
    return null;
  }

  // Nicht sofort loslaufen: Beim Deploy starten mehrere Dinge gleichzeitig, und
  // ein Sync auf der ersten Sekunde konkurriert mit dem Verbindungsaufbau zur
  // Datenbank. Der erste Lauf kommt mit dem ersten regulaeren Tick.
  timer = setInterval(() => void tick(), minutes * 60_000);
  // Der Zeitgeber darf den Prozess nicht am Leben halten, wenn sonst nichts mehr
  // laeuft — sonst haengt ein SIGTERM-Shutdown an ihm.
  timer.unref?.();
  console.log(`[maitr] Zeitgeber aktiv: alle ${minutes} Minuten`);
  return minutes;
}

/** Fuer Tests und einen geordneten Shutdown. */
export function stopMaitrScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
  running = false;
}
