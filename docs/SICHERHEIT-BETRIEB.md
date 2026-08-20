# Betriebliche Sicherheitseinstellungen

Kurze Anleitung zu den Einstellungen, die nicht im Code stehen, sondern in der
Umgebung – und die falsch gesetzt still wirkungslos sind.

---

## `TRUST_PROXY_HOPS` – wovon `req.ip` abhängt

**Vorgabe: 1.** Ohne die Variable bleibt es dabei; das ist der sichere Wert.

### Worum es geht

Express bestimmt `req.ip` aus der Einstellung `trust proxy`. Steht sie auf
`false` (Express' Vorgabe), ist `req.ip` die Adresse der **Gegenstelle** – also
des Proxys, nicht des Klienten. `netlify.toml` leitet `/api/*` mit
`force = true` an Railway weiter; damit stand für jeden Nutzer dieselbe Adresse
in `req.ip`.

Folge: Jede Drossel in `server/middleware/rateLimit.ts` war **ein Eimer für die
ganze Plattform**. `strictLimiter` erlaubt 10 Anfragen je 5 Minuten – zehn
Aufrufe von einem einzigen Rechner legten `/api/forward-to-n8n`, `/api/autogen`,
`/api/schema/*` und `/api/orders/create` für alle Kunden still.

### Warum nicht einfach `true`

`true` heißt „glaube dem `X-Forwarded-For` vollständig". Der Railway-Dienst ist
unter seiner eigenen Adresse **öffentlich erreichbar**, also auch ohne den Umweg
über Netlify. Dort hängt ein Angreifer einen beliebigen `X-Forwarded-For` an und
sucht sich seinen Zähler selbst aus. Die Drossel wäre wieder wirkungslos – nur
diesmal, ohne dass es auffiele.

Dieselbe Überlegung begrenzt die Zahl nach oben: Eine zu **hohe** Zahl lässt den
Angreifer die überzähligen Sprünge selbst fälschen. Eine zu niedrige ist nur
ungenau. Deshalb im Zweifel die kleinere.

### Warum 1 und nicht 2

Die beiden Wege haben unterschiedlich viele Sprünge:

| Weg | Sprünge |
|---|---|
| Browser → Netlify → Railway → App | 2 |
| Mobil-App / direkter Aufruf → Railway → App | 1 |

Die Zahl muss zum **kürzesten** Weg passen, sonst ist sie für diesen Weg zu
hoch. Solange der Railway-Dienst unmittelbar erreichbar ist, gehört sie auf 1.

### Wie man den richtigen Wert misst

1. In Railway vorübergehend mitschreiben, was ankommt:
   ```ts
   app.use((req, _res, next) => {
     console.log("[ip]", req.ip, "| xff:", req.headers["x-forwarded-for"]);
     next();
   });
   ```
2. Einmal über `https://www.maitr.de/api/ping` aufrufen und einmal unmittelbar
   über die Railway-Adresse.
3. Die Zahl der Einträge in `x-forwarded-for` auf dem **kürzeren** Weg ist der
   Wert für `TRUST_PROXY_HOPS`.
4. Gegenprobe: Aus zwei verschiedenen Netzen (z.B. WLAN und Mobilfunk) aufrufen –
   `req.ip` muss sich unterscheiden. Tut es das nicht, ist die Zahl zu niedrig.
5. Gegenprobe in die andere Richtung: Mit `curl -H "X-Forwarded-For: 1.2.3.4"`
   gegen die Railway-Adresse. Erscheint `1.2.3.4` in `req.ip`, ist die Zahl zu
   **hoch** – sofort zurücksetzen.

### Die dauerhaftere Lösung

Solange Railway unmittelbar erreichbar ist, bleibt die Zahl auf dem kleinsten
gemeinsamen Nenner. Wer den Dienst so einrichtet, dass er **nur** Verkehr von
Netlify annimmt, hat einen einzigen bekannten Weg – und kann die Zahl dann
sauber auf dessen Sprungzahl setzen.

### Was unabhängig davon schon greift

`limitKey` in `server/middleware/rateLimit.ts` nimmt, wo jemand angemeldet ist,
die **Kontokennung** statt der Adresse. Die stammt aus dem geprüften
Clerk-Token, überlebt jeden Proxy und lässt sich nicht fälschen. Für alle
Endpunkte, bei denen `requireAuth` **vor** der Drossel hängt, ist die Frage nach
der Sprungzahl damit gegenstandslos.

---

## Prüfungen, die das absichern

| Datei | Was sie festhält |
|---|---|
| `server/__tests__/mailMaskierung.spec.ts` | Einschleusung von HTML in Mails |
| `server/__tests__/n8nProxyAdresse.spec.ts` | SSRF über den n8n-Weg, Feldwahl |
| `server/__tests__/reservierungGrenzen.spec.ts` | Buchungen außerhalb des Zeitraums |
| `server/__tests__/safeFetch.spec.ts` | Adressbewertung (internes Netz) |

> **Hinweis zur Testumgebung:** Die Suite braucht Node ≥ 22.12 (`.nvmrc`).
> Unter 22.11 bricht die jsdom-Umgebung mit `ERR_REQUIRE_ESM` ab, und es läuft
> nur ein Teil der Prüfungen – ohne dass der Lauf als fehlgeschlagen gilt.
