import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Beispielhafte Schwachstellen von Restaurant-Websites – KEINE Gästestimmen.
 *
 * Hier standen zwölf erfundene Zitate, jedes mit Vornamen und Initiale,
 * Sternewertung, Avatar und Zeitangabe. Erfundene Verbraucherbewertungen sind
 * unzulässig, und wer Bewertungen zeigt, muss zusätzlich offenlegen, ob und
 * wie er ihre Echtheit prüft – was bei erfundenen Personen niemand kann.
 * Das Problem, das der Abschnitt illustriert, ist dasselbe geblieben; es
 * tritt nur nicht mehr als Zitat einer Person auf, sondern als neutrale
 * Beschreibung der Situation. Deshalb bewusst: kein Name, kein Stern, keine
 * Zeitangabe, kein Avatar – sonst sieht es wieder aus wie eine Bewertung.
 */
const problemBeispiele1 = [
  {
    text: "Die Seite lädt auf dem Handy so lange, dass Gäste vorher abspringen.",
    topic: "Ladezeit",
  },
  {
    text: "Die Speisekarte liegt nur als winziges PDF vor und ist mobil kaum lesbar.",
    topic: "Speisekarte",
  },
  {
    text: "Ein Tisch lässt sich online nirgends anfragen – es bleibt nur der Anruf.",
    topic: "Reservierung",
  },
  {
    text: "Preise und Tagesangebote sind auf dem Smartphone schwer zu finden.",
    topic: "Orientierung",
  },
  {
    text: "Von unterwegs führt kein schneller Weg zur aktuellen Karte.",
    topic: "Mobil",
  },
  {
    text: "Spontane Anfragen scheitern, weil das Handy keine Buchung anbietet.",
    topic: "Reservierung",
  },
];

const problemBeispiele2 = [
  {
    text: "Der Online-Auftritt wirkt älter, als das Restaurant tatsächlich ist.",
    topic: "Auftritt",
  },
  {
    text: "Schrift und Buttons sind auf kleinen Displays kaum zu treffen.",
    topic: "Bedienung",
  },
  {
    text: "Die Karte lässt sich nur mit ständigem Zoomen lesen.",
    topic: "Speisekarte",
  },
  {
    text: "Die Telefonnummer versteckt sich auf einer veralteten Unterseite.",
    topic: "Kontakt",
  },
  {
    text: "Öffnungszeiten stehen an mehreren Stellen unterschiedlich.",
    topic: "Vertrauen",
  },
  {
    text: "Die Speisekarte ist tief in der Navigation vergraben.",
    topic: "Navigation",
  },
];

/**
 * Jede Reihe läuft zweimal durch die Marquee – nur so trifft das Ende der
 * Animation wieder auf den Anfang und der Umlauf wirkt nahtlos.
 */
const marqueeReihe1 = [...problemBeispiele1, ...problemBeispiele1];
const marqueeReihe2 = [...problemBeispiele2, ...problemBeispiele2];

/**
 * Die CSS-Klassen heißen weiterhin "ck-review-*", weil check.css hier nicht
 * angefasst wird. Inhaltlich ist die Karte keine Bewertung mehr: nur die
 * Beschreibung und ein Themen-Label, kein Verfasser.
 */
function ProblemBeispielCard({ text, topic }: { text: string; topic: string }) {
  return (
    <div className="ck-review-card ck-marquee-card">
      <div className="ck-review-text">{text}</div>
      <div className="ck-review-meta">
        <span className="ck-review-name">{topic}</span>
      </div>
    </div>
  );
}

const isValidUrl = (url: string) =>
  /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(url.trim());

/* ── iPhone Mockup: Startseite ── */
function PhoneMockupStartPage() {
  return (
    <div className="ck-phone-wrap">
      <div className="ck-phone-outer">
        <div className="ck-btn ck-btn--power" />
        <div className="ck-btn ck-btn--vol1" />
        <div className="ck-btn ck-btn--vol2" />
        <div className="ck-phone-screen">
          <div className="ck-island">
            <div className="ck-island-speaker" />
            <div className="ck-island-cam" />
          </div>
          <div
            className="ck-app"
            style={{
              background: "#fdf8ef",
              transform: "scale(0.92)",
              transformOrigin: "top center",
              height: "108.7%",
            }}
          >
            <div
              className="ck-app-hdr"
              style={{
                background: "#fdf8ef",
                borderBottom: "none",
                alignItems: "center",
              }}
            >
              <div className="ck-app-brand">
                <span
                  className="ck-app-icon"
                  style={{
                    background: "#e8dac5",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="#000"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v20M17 5v14M7 5v14M4 5h6M14 5h6" />
                  </svg>
                </span>
                <span
                  className="ck-app-name"
                  style={{
                    fontSize: "16px",
                    fontWeight: "800",
                    marginLeft: "2px",
                  }}
                >
                  Millies
                </span>
              </div>
              <div
                className="ck-app-hbg"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  opacity: 1,
                }}
              >
                <span
                  style={{
                    width: "16px",
                    height: "2px",
                    background: "#000",
                    borderRadius: "2px",
                    display: "block",
                  }}
                />
                <span
                  style={{
                    width: "16px",
                    height: "2px",
                    background: "#000",
                    borderRadius: "2px",
                    display: "block",
                  }}
                />
                <span
                  style={{
                    width: "16px",
                    height: "2px",
                    background: "#000",
                    borderRadius: "2px",
                    display: "block",
                  }}
                />
              </div>
            </div>
            <div className="ck-scroll" style={{ padding: "12px 14px 80px" }}>
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "24px",
                  marginTop: "12px",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-h)",
                    fontSize: "24px",
                    fontWeight: 800,
                    margin: "0 0 12px 0",
                    color: "#000",
                  }}
                >
                  Willkommen
                </h2>
                <p
                  style={{
                    fontFamily: "var(--font-b)",
                    fontSize: "12px",
                    color: "#4b5563",
                    margin: "0 auto",
                    lineHeight: 1.5,
                    maxWidth: "220px",
                  }}
                >
                  Wir bieten beste Qualität und eine tolle Atmosphäre.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "12px",
                  padding: "0 4px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: "800",
                    color: "#6b7280",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Highlights
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: "700",
                    color: "#4b5563",
                  }}
                >
                  Alle →
                </span>
              </div>

              <div
                style={{
                  background: "#fff",
                  padding: "14px",
                  borderRadius: "16px",
                  marginBottom: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "4px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-h)",
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#000",
                    }}
                  >
                    Wiener Schnitzel
                  </h3>
                  <span
                    style={{
                      fontWeight: "800",
                      fontSize: "14px",
                      color: "#000",
                    }}
                  >
                    18.90€
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "11px",
                    color: "#6b7280",
                    lineHeight: 1.4,
                    paddingRight: "30px",
                  }}
                >
                  Zartes Kalbsschnitzel mit Kartoffelsalat
                </p>
                <span
                  style={{
                    display: "inline-block",
                    background: "#f3f4f6",
                    color: "#4b5563",
                    fontSize: "9px",
                    fontWeight: "600",
                    padding: "4px 8px",
                    borderRadius: "100px",
                  }}
                >
                  Hauptgerichte
                </span>
              </div>

              <div
                style={{
                  background: "#fff",
                  padding: "14px",
                  borderRadius: "16px",
                  marginBottom: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "4px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-h)",
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#000",
                    }}
                  >
                    Rindersteak
                  </h3>
                  <span
                    style={{
                      fontWeight: "800",
                      fontSize: "14px",
                      color: "#000",
                    }}
                  >
                    24.90€
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "11px",
                    color: "#6b7280",
                    lineHeight: 1.4,
                    paddingRight: "30px",
                  }}
                >
                  200g mit Kräuterbutter und Pommes
                </p>
                <span
                  style={{
                    display: "inline-block",
                    background: "#f3f4f6",
                    color: "#4b5563",
                    fontSize: "9px",
                    fontWeight: "600",
                    padding: "4px 8px",
                    borderRadius: "100px",
                  }}
                >
                  Hauptgerichte
                </span>
              </div>

              <div
                style={{
                  background: "#fff",
                  padding: "14px",
                  borderRadius: "16px",
                  marginBottom: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "4px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-h)",
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#000",
                    }}
                  >
                    Pasta Carbonara
                  </h3>
                  <span
                    style={{
                      fontWeight: "800",
                      fontSize: "14px",
                      color: "#000",
                    }}
                  >
                    14.50€
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "11px",
                    color: "#6b7280",
                    lineHeight: 1.4,
                    paddingRight: "30px",
                  }}
                >
                  Mit Speck, Ei und Parmesan
                </p>
                <span
                  style={{
                    display: "inline-block",
                    background: "#f3f4f6",
                    color: "#4b5563",
                    fontSize: "9px",
                    fontWeight: "600",
                    padding: "4px 8px",
                    borderRadius: "100px",
                  }}
                >
                  Pasta
                </span>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "16px",
                left: "12px",
                right: "12px",
                zIndex: 10,
              }}
            >
              <button
                style={{
                  width: "100%",
                  background: "#fbc77d",
                  color: "#fff",
                  border: "none",
                  padding: "14px",
                  borderRadius: "100px",
                  fontSize: "14px",
                  fontFamily: "var(--font-h)",
                  fontWeight: "800",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(251, 199, 125, 0.4)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Tisch reservieren
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="ck-phone-badge">App Erlebnis ✦</div>
    </div>
  );
}

/* ── iPhone Mockup 2: Reservation ── */
function PhoneMockupReservation() {
  return (
    <div className="ck-phone-wrap">
      <div className="ck-phone-outer">
        <div className="ck-btn ck-btn--power" />
        <div className="ck-btn ck-btn--vol1" />
        <div className="ck-btn ck-btn--vol2" />
        <div className="ck-phone-screen">
          <div className="ck-island">
            <div className="ck-island-speaker" />
            <div className="ck-island-cam" />
          </div>
          <div className="ck-res-app">
            <div className="ck-res-title">Tisch reservieren</div>

            <div className="ck-res-row">
              <div className="ck-res-label">Personen</div>
              <div className="ck-res-pills">
                <div className="ck-res-pill">1</div>
                <div className="ck-res-pill active">2</div>
                <div className="ck-res-pill">3</div>
                <div className="ck-res-pill">4</div>
                <div className="ck-res-pill">5+</div>
              </div>
            </div>

            <div className="ck-res-row">
              <div className="ck-res-label">Datum</div>
              <div className="ck-res-pills">
                <div className="ck-res-pill active">Heute</div>
                <div className="ck-res-pill">Morgen</div>
                <div className="ck-res-pill">Fr, 25.02.</div>
              </div>
            </div>

            <div className="ck-res-row">
              <div className="ck-res-label">Uhrzeit</div>
              <div className="ck-res-time-grid">
                <div className="ck-res-pill">18:00</div>
                <div className="ck-res-pill">18:30</div>
                <div className="ck-res-pill active">19:00</div>
                <div className="ck-res-pill">19:30</div>
                <div className="ck-res-pill">20:00</div>
              </div>
            </div>

            <div className="ck-res-btn">Tisch Anfragen</div>
          </div>
        </div>
      </div>
      <div
        className="ck-phone-badge"
        style={{
          background: "linear-gradient(135deg, var(--coral), var(--red))",
        }}
      >
        In Sekunden gebucht ✦
      </div>
    </div>
  );
}

/* ── iPhone Mockup: Speisekarte (Problem 05) ── */
function PhoneMockupMenu() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#fdf8ef",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px 12px 10px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-h)",
            fontSize: "20px",
            fontWeight: "800",
            color: "#000",
            margin: "0 0 12px 0",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          Speisekarte
        </h3>

        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "hidden",
            marginBottom: "12px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              background: "#000",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "100px",
              fontSize: "10px",
              fontWeight: "800",
              whiteSpace: "nowrap",
            }}
          >
            Alle
          </span>
          <span
            style={{
              border: "1px solid #e5e7eb",
              padding: "4px 10px",
              borderRadius: "100px",
              fontSize: "10px",
              fontWeight: "700",
              color: "#4b5563",
              whiteSpace: "nowrap",
            }}
          >
            Vorspeisen
          </span>
          <span
            style={{
              border: "1px solid #e5e7eb",
              padding: "4px 10px",
              borderRadius: "100px",
              fontSize: "10px",
              fontWeight: "700",
              color: "#4b5563",
              whiteSpace: "nowrap",
            }}
          >
            Salate
          </span>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "800",
              color: "#000",
              margin: "0 0 10px 0",
              fontFamily: "var(--font-h)",
            }}
          >
            Vorspeisen
          </div>

          <div
            style={{
              background: "#fff",
              padding: "12px",
              borderRadius: "16px",
              marginBottom: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "4px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontFamily: "var(--font-h)",
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#000",
                }}
              >
                Bruschetta
              </h4>
              <span
                style={{ fontWeight: "800", fontSize: "13px", color: "#000" }}
              >
                7.50€
              </span>
            </div>
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: "11px",
                color: "#6b7280",
                lineHeight: 1.4,
                paddingRight: "30px",
              }}
            >
              Geröstetes Brot mit Tomaten und Basilikum
            </p>
            <span
              style={{
                display: "inline-block",
                background: "#f3f4f6",
                color: "#4b5563",
                fontSize: "9px",
                fontWeight: "600",
                padding: "3px 8px",
                borderRadius: "100px",
              }}
            >
              Vorspeisen
            </span>
          </div>

          <div
            style={{
              fontSize: "14px",
              fontWeight: "800",
              color: "#000",
              margin: "16px 0 10px 0",
              fontFamily: "var(--font-h)",
            }}
          >
            Salate
          </div>

          <div
            style={{
              background: "#fff",
              padding: "12px",
              borderRadius: "16px",
              marginBottom: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "4px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontFamily: "var(--font-h)",
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#000",
                }}
              >
                Caesar Salad
              </h4>
              <span
                style={{ fontWeight: "800", fontSize: "13px", color: "#000" }}
              >
                12.90€
              </span>
            </div>
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: "11px",
                color: "#6b7280",
                lineHeight: 1.4,
                paddingRight: "30px",
              }}
            >
              Mit gegrilltem Hähnchen und Croutons
            </p>
            <span
              style={{
                display: "inline-block",
                background: "#f3f4f6",
                color: "#4b5563",
                fontSize: "9px",
                fontWeight: "600",
                padding: "3px 8px",
                borderRadius: "100px",
              }}
            >
              Salate
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          height: "40px",
          background: "linear-gradient(to top, #fdf8ef 20%, transparent)",
          zIndex: 10,
        }}
      ></div>
    </div>
  );
}

/* ── Wavy SVG borders ── */
const WaveTop = ({ fill }: { fill: string }) => (
  <svg
    viewBox="0 0 1440 60"
    preserveAspectRatio="none"
    className="ck-wave-svg"
    style={{ height: 48 }}
  >
    <path
      d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z"
      fill={fill}
    />
  </svg>
);
const WaveBottom = ({ fill }: { fill: string }) => (
  <svg
    viewBox="0 0 1440 60"
    preserveAspectRatio="none"
    className="ck-wave-svg"
    style={{ height: 48 }}
  >
    <path
      d="M0,30 C240,0 480,60 720,30 C960,0 1200,60 1440,30 L1440,0 L0,0 Z"
      fill={fill}
    />
  </svg>
);

/* ══════════════════════════════════════════════
   CheckPage
══════════════════════════════════════════════ */
export default function CheckPage() {
  const [heroUrl, setHeroUrl] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [barsGo, setBarsGo] = useState(false);
  const speedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting)
            (e.target as HTMLElement).classList.add("ck-visible");
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".ck-fade").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = speedRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setBarsGo(true);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const submit = useCallback(
    async (url: string, setErr: (e: string | null) => void) => {
      setErr(null);
      if (!isValidUrl(url)) {
        setErr(
          "Bitte gib eine gültige URL ein (z.B. https://dein-restaurant.de)",
        );
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/forward-to-n8n", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            link: url,
            timestamp: new Date().toISOString(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr("Server Fehler. Bitte versuche es erneut.");
          setLoading(false);
          return;
        }
        window.location.href = `/mode-selection?sourceLink=${encodeURIComponent(url)}`;
      } catch {
        setErr("Verbindungsfehler. Bitte prüfe deine Internetverbindung.");
        setLoading(false);
      }
    },
    [],
  );

  const scrollToCta = () =>
    document.getElementById("ck-cta")?.scrollIntoView({ behavior: "smooth" });

  /**
   * Der eigene Maitr-Balken ist raus: Er lieferte die Sekundenzahl, auf der
   * die entfernte Spitzenstellungsbehauptung darunter aufsetzte, und für ihn
   * gibt es keine Messung, die wir vorzeigen könnten.
   * ("sub" war an keiner Stelle ausgelesen und ist mit rausgefallen.)
   *
   * Auch der zweite Balken "Münster Ø" ist weg. Er gab einen Ortsdurchschnitt
   * als eigene Messung aus, den wir nie erhoben haben, und dieselbe Zahl stand
   * in der Zwillingsdatei anders im Banner als hier im Balken.
   * Der Vergleich bleibt erhalten, stellt jetzt aber zwei Schwellenwerte
   * gegenüber, die durch die Quellenzeile unter dem Text gedeckt sind:
   * den Zielwert und die Grenze, ab der die Mehrheit abspringt.
   * Die Balkenbreiten bleiben proportional zu den Sekunden (45/75 = 1.8/3.0).
   */
  const speedBars = [
    { lbl: "Ideal", color: "#22c55e", w: 45, val: "1.8s" },
    { lbl: "Kritisch ab", color: "#f97316", w: 75, val: "3.0s" },
  ];

  return (
    <>
      {/* ── NAV ── */}
      <nav className="ck-nav">
        <div className="ck-nav-inner">
          <div
            className="ck-logo-wrap"
            onClick={() => (window.location.href = "/")}
          >
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "6px" }}
            >
              <div style={{ position: "relative" }}>
                <span className="ck-logo">Maitr</span>
                <div className="ck-logo-dot" />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-b)",
                  fontSize: "14px",
                  color: "rgba(0, 0, 0, .6)",
                }}
              >
                Check
              </span>
            </div>
          </div>
          <div className="ck-nav-links">
            <a className="ck-nav-link" href="#p01">
              Ladezeit
            </a>
            <a className="ck-nav-link" href="#p02">
              Mobile
            </a>
            {/* Abschnitt 03 handelt nicht mehr von Bewertungen, sondern von
                den Hürden, an denen Gäste online scheitern – deshalb zieht der
                Menütext mit. Die Sprungmarke selbst bleibt "#p03": Sie ist eine
                reine Nummerierung ohne Thema, und geteilte Links auf den
                Abschnitt sollen weiter funktionieren. */}
            <a className="ck-nav-link" href="#p03">
              Hürden
            </a>
            <a className="ck-nav-link" href="#s-reservation">
              Reservierung
            </a>
            <a className="ck-nav-link" href="#s-pdf">
              Speisekarte
            </a>
          </div>
          <button
            className="ck-nav-cta"
            style={{ borderRadius: "100px" }}
            onClick={scrollToCta}
          >
            Jetzt prüfen
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="ck-hero">
        <div className="ck-wrap">
          <div className="ck-hero-badge">
            <div className="ck-hero-badge-dot" />
            Kostenlose Analyse in 30 Sekunden
          </div>
          {/* Vorher: "9 von 10 Gästen googlen dich." Eine harte Quote ohne
              jede Quelle – die Zahl haben wir nicht erhoben und können sie
              nicht belegen. Die Kernaussage der Seite braucht sie nicht: Sie
              lautet, dass Gäste sich vorab online informieren und dabei auf
              das treffen, was der Check gleich prüft. (Nebenbei behoben: Der
              alte Satz sprang mitten in der Zeile von "dich" auf "Sie".) */}
          <h1 className="ck-hero-h1">
            Deine Gäste googlen dich, bevor sie kommen. Was finden sie?
          </h1>
          <p
            style={{
              fontFamily: "var(--font-h)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--teal)",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              marginBottom: "24px",
              marginTop: "-8px",
            }}
          >
            powered by Maitr
          </p>
          <p className="ck-hero-sub">
            Gib deine Website ein. Wir zeigen dir, wo du täglich Gäste und
            Umsatz verlierst.
          </p>

          <div className="ck-input-row">
            <input
              type="url"
              placeholder="https://dein-restaurant.de oder Google Maps Link"
              value={heroUrl}
              onChange={(e) => {
                setHeroUrl(e.target.value);
                setUrlError(null);
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && submit(heroUrl, setUrlError)
              }
              disabled={loading}
            />
            <button
              className="ck-input-btn"
              onClick={() => submit(heroUrl, setUrlError)}
              disabled={loading}
            >
              {loading ? "Analysiere..." : "Analysieren"}
            </button>
          </div>

          {urlError && <div className="ck-input-error">{urlError}</div>}

          <div className="ck-trust">
            <div className="ck-trust-item">
              <div className="ck-trust-check">✓</div> Kostenlos
            </div>
            <div className="ck-trust-item">
              <div className="ck-trust-check">✓</div> Keine Anmeldung
            </div>
            {/* Hier stand eine Zahl bereits analysierter Restaurants. Sie ist
                nirgends belegt und wäre als Erfolgsbeleg angreifbar – ersetzt
                durch eine Eigenschaft des Angebots, die ohne Zahl auskommt. */}
            <div className="ck-trust-item">
              <div className="ck-trust-check">✓</div> Unverbindlich
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAL WAVE STATS ── */}
      <div style={{ background: "#fff" }}>
        <WaveTop fill="#0d9488" />
      </div>
      <div className="ck-wave-banner">
        <div className="ck-wave-content">
          {/* Hier stand "8.4s – Ladezeit Münster Restaurants im Schnitt".
              Diesen Ortsdurchschnitt messen wir nicht, und er widersprach der
              Zahl im Fließtext von Abschnitt 01. Ersetzt durch die
              Abbruchquote, die im Abschnitt darunter ohnehin mit Quelle steht –
              die anderen beiden Kacheln wiederholen ebenfalls belegte Werte. */}
          <div className="ck-wave-stat ck-fade">
            <div className="ck-wave-num">53%</div>
            <div className="ck-wave-label">
              springen nach 3 Sekunden Ladezeit ab
            </div>
          </div>
          <div className="ck-wave-sep" />
          <div className="ck-wave-stat ck-fade ck-fade-d1">
            <div className="ck-wave-num">78%</div>
            <div className="ck-wave-label">
              der Besuche starten auf dem Smartphone
            </div>
          </div>
          <div className="ck-wave-sep" />
          <div className="ck-wave-stat ck-fade ck-fade-d2">
            <div className="ck-wave-num">7%</div>
            <div className="ck-wave-label">
              Conversion verloren pro Sekunde Ladezeit
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: "#fff" }}>
        <WaveBottom fill="#0a0f1a" />
      </div>

      {/* ── PROBLEM 01: SPEED ── */}
      <section className="ck-section" id="p01">
        <div className="ck-wrap">
          <div className="ck-section-inner">
            <div className="ck-fade ck-text-col">
              <div className="ck-section-num">
                <span className="ck-section-num-pill">01</span>
                Problem
              </div>
              <h2 className="ck-section-h2">
                Deine Gäste warten nicht.
                <br />
                Google auch nicht.
              </h2>
              {/* Der Einstieg "Ein Restaurant in Münster braucht im Schnitt X
                  Sekunden" ist ersatzlos gestrichen: Wir haben diesen
                  Ortsdurchschnitt nie gemessen, und die Zahl stand in dieser
                  Datei anders als im Banner darüber. Übrig bleiben der
                  Zielwert und die belegte Abbruchquote. */}
              <p className="ck-section-body">
                Eine gute Seite steht in unter 1.8 Sekunden. Nach 3 Sekunden
                verlassen <strong>53% aller Besucher</strong> die Seite ohne
                wiederzukommen.
                <br />
                <br />
                Jede Sekunde Ladezeit kostet dich bis zu{" "}
                <strong>7% Conversion</strong>.
              </p>
              <div className="ck-source">
                Quelle: Google/Deloitte Study 2024, HTTPArchive
              </div>
            </div>

            <div
              className="ck-speed-card ck-fade ck-fade-d1 ck-vis-col"
              style={{ marginLeft: "auto", width: "100%", maxWidth: "480px" }}
              ref={speedRef}
            >
              <div className="ck-speed-title">Ladezeit Vergleich</div>
              {speedBars.map(({ lbl, color, w, val }) => (
                <div key={lbl} className="ck-bar-row">
                  <span className="ck-bar-lbl">{lbl}</span>
                  <div className="ck-bar-track">
                    <div
                      className="ck-bar-fill"
                      style={{
                        background: color,
                        width: barsGo ? `${w}%` : "0%",
                      }}
                    />
                  </div>
                  <span className="ck-bar-val" style={{ color }}>
                    {val}
                  </span>
                </div>
              ))}
              {/* Vorher stand hier eine feste Sekundenzahl für Maitr plus die
                  Behauptung, damit schneller zu sein als fast alle anderen
                  Restaurantseiten. Für diese Spitzenstellung gibt es weder
                  eine Messung noch eine Vergleichsgrundlage. Ersetzt durch
                  das, was wir tatsächlich tun – ohne Zahl. */}
              <div className="ck-speed-note">
                <strong>Maitr</strong> baut deine Seite von Anfang an auf kurze
                Ladezeiten aus: schlanke Seiten, optimierte Bilder, keine
                PDF-Umwege.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM 02: MOBILE ── */}
      <section className="ck-section ck-section--dark" id="p02">
        <div className="ck-wrap">
          <div className="ck-section-inner">
            <div className="ck-fade ck-fade-d1 ck-vis-col">
              <PhoneMockupStartPage />
            </div>
            <div className="ck-fade ck-text-col">
              <div className="ck-section-num">
                <span className="ck-section-num-pill">02</span>
                Problem
              </div>
              <h2 className="ck-section-h2">
                78% Mobil Nutzer.
                <br />
                Kein App Erlebnis.
              </h2>
              <p className="ck-section-body">
                Drei von vier Gästen suchen dich auf dem Smartphone. Was sie
                finden? Eine Website die nicht für ihr Gerät gebaut ist. Keine
                schnelle Speisekarte. Kein Homescreen Icon.
                <br />
                <br />
                <strong>
                  Maitr macht deine Website zur App. Ohne App Store. Ohne
                  Entwickler.
                </strong>
              </p>
              <div className="ck-source">
                Quelle: Statista Digital Market Outlook 2024
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM 03: HÜRDEN ──
          Dieser Abschnitt hieß "Reviews" und trug links das Bewertungsthema,
          während rechts seit dem Entfernen der erfundenen Gästezitate
          Website-Mängel laufen (Ladezeit, Speisekarte, Reservierung).
          Überschrift und Inhalt passten nicht mehr zusammen.

          Aufgelöst über die Textseite, nicht über die Kartenseite: Die Karten
          sind belegfrei formulierte Beispielsituationen und damit unbedenklich –
          sie zum Bewertungsthema zurückzudrehen hieße, in Bewertungs-Optik
          wieder Bewertungsinhalte zu zeigen, also genau dorthin, wo das
          Problem herkam. Stattdessen folgt der Text den Karten.

          Mit gestrichen: "Restaurants mit aktivem Review Management haben 34%
          mehr Reservierungen". Die Quellenzeile nannte pauschal zwei Häuser,
          ohne dass die Zahl einer davon zuzuordnen wäre. Da der Abschnitt jetzt
          gar keine Zahl mehr behauptet, entfällt die Quellenzeile mit.
          Das Bewertungsthema bleibt der Seite als Produktversprechen in der
          Feature-Karte "Bessere Bewertungen" weiter unten erhalten. */}
      <section className="ck-section" id="p03">
        <div className="ck-wrap">
          <div className="ck-section-inner">
            <div className="ck-fade ck-text-col">
              <div className="ck-section-num">
                <span className="ck-section-num-pill">03</span>
                Problem
              </div>
              <h2 className="ck-section-h2">
                Nicht ein großes Problem.
                <br />
                Viele kleine Hürden.
              </h2>
              <p className="ck-section-body">
                Gäste springen selten wegen einer einzigen Sache ab. Sie
                springen ab, weil sich Kleinigkeiten summieren: Die Karte lädt
                nicht, die Telefonnummer ist nicht zu finden, die
                Öffnungszeiten stehen an zwei Stellen unterschiedlich.
                <br />
                <br />
                Jede Hürde für sich wirkt harmlos. Zusammen kosten sie den
                Besuch – und du erfährst nie, warum jemand nicht gekommen ist.
                <br />
                <br />
                <strong>
                  Maitr räumt diese Hürden aus dem Weg, auf einer Seite, die
                  fürs Handy gebaut ist.
                </strong>
              </p>
            </div>

            <div
              className="ck-review-visual ck-fade ck-fade-d1 ck-vis-col"
              style={{
                width: "100%",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Vorher: eine erfundene Durchschnittsnote samt Sternen,
                  zugeschrieben an "Dein Restaurant". Diese Note kennen und
                  messen wir für einen fremden Betrieb nicht – und mit Sternen
                  daneben sieht sie aus wie ein echtes Bewertungsergebnis.
                  Der Titel sagt jetzt ohne Zahl, was die Karten zeigen. */}
              <div>
                <div className="ck-feature-title">
                  Woran Gäste online scheitern
                </div>
                <div className="ck-rating-sub">
                  Beispielhafte Situationen zur Veranschaulichung – keine
                  Gästebewertungen.
                </div>
              </div>
              <div className="ck-marquee-mask" style={{ marginTop: "24px" }}>
                <div className="ck-marquee-row">
                  <div className="ck-marquee-track ck-track-left">
                    {marqueeReihe1.map((b, i) => (
                      <ProblemBeispielCard key={i} {...b} />
                    ))}
                  </div>
                </div>
                <div className="ck-marquee-row" style={{ marginTop: "16px" }}>
                  <div className="ck-marquee-track ck-track-right">
                    {marqueeReihe2.map((b, i) => (
                      <ProblemBeispielCard key={i} {...b} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM 04: RESERVATION ── */}
      <section className="ck-section ck-section--dark" id="s-reservation">
        <div className="ck-wrap">
          <div className="ck-section-inner">
            <div className="ck-fade ck-text-col">
              <div className="ck-section-num">
                <span className="ck-section-num-pill">04</span>
                Problem
              </div>
              <h2 className="ck-section-h2">
                Telefon klingelt?
                <br />
                Umsatz verpasst.
              </h2>
              <p className="ck-section-body">
                Wenn Gäste anrufen müssen, rufen viele gar nicht erst an. Oder
                das Telefon klingelt ausgerechnet dann, wenn der Service im
                Stress ist.
                <br />
                <br />
                <strong>
                  Maitr macht Reservierungen buchbar – über die Website, Google
                  und Instagram. Automatisch.
                </strong>
              </p>
              {/* Raus sind die Sekundenangabe für die Buchung und die darunter
                  stehende Quellenzeile auf eigene, unveröffentlichte Zahlen.
                  Eine Quelle, die niemand nachschlagen kann, belegt nichts –
                  sie behauptet nur Belegbarkeit. Ohne die Zahl braucht der
                  Absatz sie ohnehin nicht mehr. */}
            </div>
            <div className="ck-fade ck-fade-d1 ck-vis-col">
              <PhoneMockupReservation />
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM 05: PDF MENU ── */}
      <section className="ck-section" id="s-pdf">
        <div className="ck-wrap">
          <div className="ck-section-inner">
            <div className="ck-pdf-compare ck-fade ck-fade-d1 ck-vis-col">
              <div className="ck-comp-card">
                <div className="ck-comp-title">Dein PDF Menü</div>
                <div className="ck-comp-pdf">📄</div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginTop: "12px",
                    textAlign: "center",
                  }}
                >
                  Zwingend Zoom.
                  <br />
                  Lange Ladezeiten.
                </p>
              </div>
              <div className="ck-comp-card highlight" style={{ padding: 0 }}>
                <div
                  className="ck-comp-app"
                  style={{ padding: 0, background: "transparent", flex: 1 }}
                >
                  <PhoneMockupMenu />
                </div>
                <div
                  className="ck-phone-badge"
                  style={{
                    position: "absolute",
                    bottom: "-12px",
                    right: "-12px",
                    background: "var(--teal)",
                    scale: "0.8",
                  }}
                >
                  Interaktiv
                </div>
              </div>
            </div>

            <div className="ck-fade ck-text-col">
              <div className="ck-section-num">
                <span className="ck-section-num-pill">05</span>
                Problem
              </div>
              <h2 className="ck-section-h2">
                Niemand will
                <br />
                PDFs auf dem Smartphone lesen.
              </h2>
              <p className="ck-section-body">
                Das ständige Zoomen und Suchen in unübersichtlichen
                PDF-Speisekarten sorgt für Frust bei den Gästen, bevor sie
                überhaupt bestellt haben.
                <br />
                <br />
                <strong>
                  Maitr wandelt dein PDF automatisch in eine perfekte, digitale
                  und SEO-optimierte Speisekarte um.
                </strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="ck-features">
        <div className="ck-wrap">
          <h2 className="ck-features-h2">
            Alles, was dein Restaurant online braucht.
          </h2>
          <div className="ck-features-grid">
            <div className="ck-feature-card">
              <div className="ck-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="ck-feature-title">Mehr Sichtbarkeit</div>
              <div className="ck-feature-desc">
                Wir optimieren deine Seite für Google, damit du lokal vor deiner
                Konkurrenz gefunden wirst.
              </div>
            </div>
            <div className="ck-feature-card">
              <div className="ck-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="ck-feature-title">Einfache Reservierungen</div>
              <div className="ck-feature-desc">
                Lass Gäste direkt auf deiner Website, über Google oder Instagram
                Tische buchen.
              </div>
            </div>
            <div className="ck-feature-card">
              <div className="ck-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="ck-feature-title">Bessere Bewertungen</div>
              <div className="ck-feature-desc">
                Sammle automatisch neue Google Reviews und präsentiere sie
                prominent auf deiner Seite.
              </div>
            </div>
            <div className="ck-feature-card">
              <div className="ck-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <div className="ck-feature-title">Digitale Speisekarte</div>
              <div className="ck-feature-desc">
                Deine Speisekarte als interaktive App. Einfach via QR-Code am
                Tisch scannen oder zu Hause lesen.
              </div>
            </div>
            <div className="ck-feature-card">
              <div className="ck-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div className="ck-feature-title">Auf Tempo gebaut</div>
              {/* Vorher war das als Garantie auf eine feste Ladezeit auf jedem
                  Gerät formuliert. Über fremde Geräte und Mobilfunknetze
                  können wir so etwas weder zusichern noch belegen. */}
              <div className="ck-feature-desc">
                Schlanke Seiten, optimierte Bilder, keine schweren Plugins –
                damit deine Gäste nicht auf einen Ladebalken schauen.
              </div>
            </div>
            <div className="ck-feature-card">
              <div className="ck-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div className="ck-feature-title">Kein Aufwand für dich</div>
              <div className="ck-feature-desc">
                Wir kümmern uns um Setup, Hosting und regelmäßige Updates,
                während du dich auf deine Gäste konzentrierst.
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <button
              className="ck-cta-btn"
              onClick={scrollToCta}
              style={{ borderRadius: "100px", padding: "16px 32px" }}
            >
              Jetzt kostenlos analysieren
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ck-cta" id="ck-cta">
        <div className="ck-wrap">
          <div className="ck-cta-inner">
            <h2 className="ck-cta-h2">
              Bereit, mehr Gäste
              <br />
              zu gewinnen?
            </h2>
            <p className="ck-cta-sub">
              Gib deine Website ein. Dein persönlicher Restaurant Check ist in
              30 Sekunden fertig. Kostenlos und ohne Anmeldung.
            </p>
            <div className="ck-cta-input-row">
              <input
                type="url"
                placeholder="https://dein-restaurant.de"
                value={ctaUrl}
                onChange={(e) => {
                  setCtaUrl(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && submit(ctaUrl, setUrlError)
                }
                disabled={loading}
              />
              <button
                className="ck-cta-btn"
                onClick={() => submit(ctaUrl, setUrlError)}
                disabled={loading}
              >
                {loading ? "Analysiere..." : "Jetzt prüfen"}
              </button>
            </div>
            {urlError && <div className="ck-cta-error">{urlError}</div>}
            <div className="ck-cta-note">
              Kostenlos · Keine Anmeldung · 30 Sekunden
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="ck-footer">
        <div className="ck-footer-inner">
          <span className="ck-footer-copy">© 2026 Maitr · check.maitr.de</span>
          <div className="ck-footer-links">
            <a href="#">Impressum</a>
            <a href="#">Datenschutz</a>
            <a href="https://maitr.de">Hauptseite</a>
          </div>
        </div>
      </footer>
    </>
  );
}
