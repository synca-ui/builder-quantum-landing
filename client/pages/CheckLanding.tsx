import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────
   SVG Icons (inline, no external deps)
───────────────────────────────────────── */
const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconSmartphone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconMap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);
const IconBarChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function CheckLanding() {
  const [activeSection, setActiveSection] = useState(0);
  const [s2Revealed, setS2Revealed] = useState(false);
  const [speedBarsGo, setSpeedBarsGo] = useState(false);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // n8n workflow state
  const [heroUrl, setHeroUrl] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isValidUrl = (url: string) =>
    /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(url.trim());

  const submitToN8n = useCallback(async (url: string) => {
    setUrlError(null);
    if (!isValidUrl(url)) {
      setUrlError("Bitte gib eine gültige URL ein (z.B. https://dein-restaurant.de)");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/forward-to-n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: url, timestamp: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setUrlError("Server-Fehler. Bitte versuche es erneut.");
        setIsLoading(false);
        return;
      }
      navigate(`/mode-selection?sourceLink=${encodeURIComponent(url)}`);
    } catch {
      setUrlError("Verbindungsfehler. Bitte prüfe deine Internetverbindung.");
      setIsLoading(false);
    }
  }, [navigate]);

  // Scroll to a section
  const goTo = useCallback((idx: number) => {
    sectionsRef.current[idx]?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const startCheck = useCallback(() => {
    goTo(6); // scroll to CTA (S7)
  }, [goTo]);

  // IntersectionObserver for dot-nav + animations
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionsRef.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(i);
            if (i === 1) setS2Revealed(true);
            if (i === 2) setSpeedBarsGo(true);
          }
        },
        { threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const darkSections = [1, 2, 3, 4, 6];
  const isDark = darkSections.includes(activeSection);

  return (
    <>
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="cl-nav">
        <div className="cl-logo-wrap">
          <div className="cl-logo-gradient">Maitr</div>
          <div className="cl-logo-dot" />
        </div>
        <button className="cl-nav-cta" onClick={() => goTo(6)}>
          Kostenlos starten
        </button>
      </nav>

      {/* DOT NAV */}
      <div className={`cl-dots ${isDark ? "cl-dots--dark" : ""}`}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <button
            key={i}
            className={`cl-dot ${activeSection === i ? "cl-dot--active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Go to section ${i + 1}`}
          />
        ))}
      </div>

      {/* SCROLL CONTAINER */}
      <div className="cl-scroll-container">

        {/* ── S1: HERO ── */}
        <section
          ref={(el) => { sectionsRef.current[0] = el; }}
          className="cl-section cl-s1"
        >
          <div className="cl-grid-bg" />
          <div className="cl-hero-glow" />

          <div className="cl-pill cl-pill-1">
            PageSpeed <strong style={{ color: "var(--cl-red)" }}>34/100</strong>
          </div>
          <div className="cl-pill cl-pill-2">
            SEO Score <strong style={{ color: "var(--cl-green)" }}>91/100</strong>
          </div>
          <div className="cl-pill cl-pill-3">
            Ladezeit <strong style={{ color: "var(--cl-amber)" }}>8.4s</strong>
          </div>
          <div className="cl-pill cl-pill-4">
            Mobile <strong style={{ color: "var(--cl-red)" }}>nicht optimiert</strong>
          </div>

          <div className="cl-hero-content">
            <div className="cl-hero-tag cl-fu cl-d1">
              <span className="cl-tag-dot" />
              <span className="cl-tag-txt">Kostenlose Analyse · 30 Sekunden</span>
            </div>
            <h1 className="cl-hero-h1 cl-fu cl-d2">
              Dein Restaurant.<br /><em>Digital. Jetzt.</em>
            </h1>
            <p className="cl-hero-sub cl-fu cl-d3">
              Gib deine Website ein — wir zeigen dir in Sekunden,<br />
              wo du täglich Gäste verlierst.
            </p>
            <div className="cl-input-wrap cl-fu cl-d4">
              <input
                ref={urlInputRef}
                type="text"
                value={heroUrl}
                onChange={(e) => { setHeroUrl(e.target.value); setUrlError(null); }}
                placeholder="https://dein-restaurant.de oder Google Maps Link"
                disabled={isLoading}
              />
              <button
                className="cl-btn-primary"
                onClick={() => submitToN8n(heroUrl)}
                disabled={isLoading || !heroUrl}
              >
                {isLoading ? "Analysiere…" : "Analysieren"}
              </button>
            </div>
            {urlError && <p className="cl-input-error cl-fu cl-d5">{urlError}</p>}
            <div className="cl-trust cl-fu cl-d5">
              <span><span className="cl-trust-check">✓</span> Kostenlos</span>
              <span className="cl-trust-dot" />
              <span><span className="cl-trust-check">✓</span> Keine Anmeldung</span>
              <span className="cl-trust-dot" />
              <span><span className="cl-trust-check">✓</span> 50+ Restaurants analysiert</span>
            </div>
          </div>

          <div className="cl-scroll-hint">
            <span>Scroll</span>
            <div className="cl-arrow cl-arrow--light" />
          </div>
        </section>

        {/* ── S2: INSIGHT (teal) ── */}
        <section
          ref={(el) => { sectionsRef.current[1] = el; }}
          className="cl-section cl-s2"
        >
          <div className="cl-s2-blob" />
          <div className="cl-s2-inner">
            <div style={{ position: "relative" }}>
              <div className="cl-big-num cl-big-num--ghost">67</div>
              <div className={`cl-big-num cl-big-num--reveal ${s2Revealed ? "cl-big-num--revealed" : ""}`}>67</div>
            </div>
            <div className="cl-s2-text">
              <div className="cl-section-label">Der digitale Realitäts-Check</div>
              <h2>Durchschnittlicher PageSpeed in Münsteraner Restaurants: 67 von 100.</h2>
              <p>
                Wir haben 50 Gastronomiebetriebe analysiert — Restaurants, Bars, Cafés.
                Der Schnitt liegt bei 67. Der Schlechteste bei 34. Der Beste bei 91.<br /><br />
                Google bewertet unter 50 als kritisch.{" "}
                <strong style={{ color: "#fff" }}>Dein Gast merkt es sofort.</strong>
              </p>
            </div>
          </div>

          <div className="cl-scroll-hint">
            <span style={{ color: "rgba(255,255,255,.4)" }}>Scroll</span>
            <div className="cl-arrow cl-arrow--dark" />
          </div>
        </section>

        {/* ── S3: PROBLEM 01 – LADEZEIT ── */}
        <section
          ref={(el) => { sectionsRef.current[2] = el; }}
          className="cl-section cl-s3"
        >
          <div className="cl-story">
            <div>
              <div className="cl-section-label cl-label--light">Problem 01</div>
              <div className="cl-story-num" style={{ color: "var(--cl-amber)" }}>
                8.4s<span className="cl-unit"> Ladezeit</span>
              </div>
              <p className="cl-story-body">
                Deine Gäste warten nicht. Google auch nicht.<br /><br />
                Ein Restaurant in Münster braucht im Schnitt{" "}
                <strong>8.4 Sekunden</strong>, bis die Seite lädt. Ideal wäre unter
                2.5s. Nach 3 Sekunden verlassen{" "}
                <strong>53% aller Besucher</strong> die Seite — für immer.
              </p>
            </div>
            <div className="cl-story-visual">
              <div className="cl-speed-visual">
                <div className="cl-speed-title">Ladezeit-Vergleich</div>
                {[
                  { lbl: "Ideal", color: "var(--cl-green)", w: 18, val: "1.8s", d: "0s" },
                  { lbl: "maitr", color: "var(--cl-teal-l)", w: 22, val: "2.1s", d: ".1s" },
                  { lbl: "Münster ⌀", color: "var(--cl-amber)", w: 60, val: "6.2s", d: ".2s" },
                  { lbl: "Schlechteste", color: "var(--cl-red)", w: 95, val: "12s", d: ".3s" },
                ].map(({ lbl, color, w, val, d }) => (
                  <div key={lbl} className="cl-speed-row">
                    <span className="cl-speed-lbl">{lbl}</span>
                    <div className="cl-speed-track">
                      <div
                        className="cl-speed-fill"
                        style={{
                          background: color,
                          width: speedBarsGo ? `${w}%` : "0%",
                          transition: `width 1.4s cubic-bezier(.25,.46,.45,.94) ${d}`,
                        }}
                      />
                    </div>
                    <span className="cl-speed-val" style={{ color }}>{val}</span>
                  </div>
                ))}
                <div className="cl-speed-note">
                  Jede Sekunde Ladezeit kostet dich<br />
                  <strong>bis zu 7% Conversion</strong>
                </div>
                <div className="cl-source">Quellen: Google/Deloitte, HTTPArchive 2024, eigene Analyse Münster-Restaurants</div>
              </div>
            </div>
          </div>
          <div className="cl-scroll-hint">
            <span style={{ color: "rgba(255,255,255,.3)" }}>Scroll</span>
            <div className="cl-arrow cl-arrow--dark" />
          </div>
        </section>

        {/* ── S4: PROBLEM 02 – MOBIL ── */}
        <section
          ref={(el) => { sectionsRef.current[3] = el; }}
          className="cl-section cl-s4"
        >
          <div className="cl-story">
            <div>
              <div className="cl-section-label cl-label--light">Problem 02</div>
              <div className="cl-story-num" style={{ color: "var(--cl-red)" }}>
                78%<span className="cl-unit"> Mobil-Nutzer</span>
              </div>
              <p className="cl-story-body">
                Drei von vier Gästen suchen dich auf dem Smartphone — während sie
                unterwegs sind, auf der Couch, an der Haltestelle.
              </p>
              <div className="cl-source cl-source--dark">Quelle: Statista Digital Market Outlook 2024</div><br /><br />
              <p className="cl-story-body">
                Was sie finden? Eine Website, die nicht für ihr Gerät gebaut ist.
                Kein App-Erlebnis. Keine schnelle Speisekarte. Kein Homescreen-Icon.<br /><br />
                <strong>maitr macht deine Website zur App — ohne App Store, ohne Entwickler.</strong>
              </p>
            </div>
            <div className="cl-story-visual">
              <div className="cl-iphone-wrap">
                <div className="cl-iphone-outer">
                  <div className="cl-iphone-btn cl-iphone-btn--power" />
                  <div className="cl-iphone-btn cl-iphone-btn--vol1" />
                  <div className="cl-iphone-btn cl-iphone-btn--vol2" />
                  <div className="cl-iphone-screen">
                    <div className="cl-iphone-island">
                      <div className="cl-iphone-island-speaker" />
                      <div className="cl-iphone-island-cam" />
                    </div>
                    <div className="cl-iphone-app">
                      {/* App Header */}
                      <div className="cl-app-header">
                        <div className="cl-app-logo-wrap">
                          <div className="cl-app-icon">🍽️</div>
                          <span className="cl-app-logo">Millies</span>
                        </div>
                        <div className="cl-app-hamburger"><span /><span /><span /></div>
                      </div>
                      {/* Speisekarte Heading */}
                      <div className="cl-app-menu-title">Speisekarte</div>
                      {/* Category Pills */}
                      <div className="cl-app-pills">
                        <div className="cl-app-pill cl-app-pill--active">Alle</div>
                        <div className="cl-app-pill">Vorspeisen</div>
                        <div className="cl-app-pill">Salate</div>
                        <div className="cl-app-pill">Suppen</div>
                      </div>
                      {/* Scrollable menu content */}
                      <div className="cl-app-scroll">
                        {/* Section: Vorspeisen */}
                        <div className="cl-app-section-head">Vorspeisen</div>
                        <div className="cl-app-item-rf">
                          <div>
                            <div className="cl-app-item-name">Bruschetta</div>
                            <div className="cl-app-item-desc">Geröstetes Brot mit Tomaten und Basilikum</div>
                            <div className="cl-app-item-tag">Vorspeisen</div>
                          </div>
                          <div className="cl-app-item-price">7.50€</div>
                        </div>
                        {/* Section: Salate */}
                        <div className="cl-app-section-head">Salate</div>
                        <div className="cl-app-item-rf">
                          <div>
                            <div className="cl-app-item-name">Caesar Salad</div>
                            <div className="cl-app-item-desc">Mit gegrilltem Hähnchen und Croutons</div>
                            <div className="cl-app-item-tag">Salate</div>
                          </div>
                          <div className="cl-app-item-price">12.90€</div>
                        </div>
                        {/* Section: Hauptgerichte */}
                        <div className="cl-app-section-head">Hauptgerichte</div>
                        <div className="cl-app-item-rf">
                          <div>
                            <div className="cl-app-item-name">Wiener Schnitzel</div>
                            <div className="cl-app-item-desc">Mit Kartoffelsalat und Preiselbeeren</div>
                            <div className="cl-app-item-tag">Hauptgerichte</div>
                          </div>
                          <div className="cl-app-item-price">18.90€</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="cl-phone-badge">App-Erlebnis ✦</div>
              </div>
            </div>
          </div>
          <div className="cl-scroll-hint">
            <span style={{ color: "rgba(255,255,255,.3)" }}>Scroll</span>
            <div className="cl-arrow cl-arrow--dark" />
          </div>
        </section>

        {/* ── S5: PROBLEM 03 – REVIEWS ── */}
        <section
          ref={(el) => { sectionsRef.current[4] = el; }}
          className="cl-section cl-s5"
        >
          <div className="cl-story">
            <div>
              <div className="cl-section-label cl-label--light">Problem 03</div>
              <div className="cl-story-num" style={{ color: "var(--cl-green)" }}>
                4.2★<span className="cl-unit"> Google Rating</span>
              </div>
              <p className="cl-story-body">
                Deine Bewertungen formen deinen ersten Eindruck — noch bevor
                ein Gast deine Website sieht.<br /><br />
                Restaurants mit aktivem Review-Management haben{" "}
                <strong>34% mehr Reservierungen</strong>. Kein Tool hilft dir
                dabei, neue Bewertungen zu sammeln oder auf negative zu reagieren.<br /><br />
                <strong>maitr zeigt dir deinen Bewertungs-Score und hilft dir, ihn zu verbessern.</strong>
              </p>
              <div className="cl-source cl-source--dark">Quelle: Harvard Business Review, BrightLocal Consumer Survey 2024</div>
            </div>
            <div className="cl-story-visual">
              <div className="cl-reviews">
                <div className="cl-big-rating">4.2</div>
                <div className="cl-stars-row">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className={`cl-star ${i === 4 ? "cl-star--half" : ""}`} />
                  ))}
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,.4)", marginBottom: 16 }}>
                  Basierend auf 127 Bewertungen
                </p>
                {[
                  { av: 'A', name: 'Anna K.', text: 'Tolles Essen, aber die Website hat ewig geladen...' },
                  { av: 'M', name: 'Max L.', text: 'Konnte keine Online-Reservierung finden. Haben am Ende angerufen.' },
                  { av: 'S', name: 'Sara F.', text: 'Sehr lecker! Aber auf dem Handy war alles durcheinander.' },
                ].map(({ av, name, text }) => (
                  <div key={name} className="cl-rev-card">
                    <div className="cl-rev-top">
                      <div className="cl-rev-av">{av}</div>
                      <div>
                        <div className="cl-rev-name">{name}</div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[0, 1, 2, 3, 4].map((j) => <div key={j} className="cl-rev-star" />)}
                        </div>
                      </div>
                    </div>
                    <p className="cl-rev-text">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="cl-scroll-hint">
            <span style={{ color: "rgba(255,255,255,.3)" }}>Scroll</span>
            <div className="cl-arrow cl-arrow--dark" />
          </div>
        </section>

        {/* ── S6: SOLUTION (light) ── */}
        <section
          ref={(el) => { sectionsRef.current[5] = el; }}
          className="cl-section cl-s6"
        >
          <div className="cl-solution-inner">
            <div className="cl-section-label" style={{ color: "var(--cl-teal)" }}>
              Die Lösung
            </div>
            <h2 className="cl-solution-h2">
              Alles, was dein Restaurant<br /><em>digital braucht.</em>
            </h2>
            <p className="cl-solution-sub">
              maitr analysiert, optimiert und baut — damit du dich um das
              Wesentliche kümmern kannst: deine Gäste.
            </p>
            <div className="cl-sol-grid">
              {[
                { icon: <IconZap />, title: "Blitzschnelle Website", text: "Ladezeiten unter 2 Sekunden. Google liebt dich. Deine Gäste auch." },
                { icon: <IconSmartphone />, title: "Mobile-First App", text: "Deine Website wird zur App — ohne App Store. Direkt auf dem Homescreen." },
                { icon: <IconStar />, title: "Review-Management", text: "Mehr positive Bewertungen sammeln. Auf negative reagieren. Automatisch." },
                { icon: <IconSearch />, title: "SEO-Optimierung", text: "Werde gefunden, wenn Gäste \"Restaurant in Münster\" googeln." },
                { icon: <IconMap />, title: "Google Maps Integration", text: "Perfektes Profil. Aktuelle Zeiten. Direkte Reservierung aus Maps." },
                { icon: <IconBarChart />, title: "Analyse & Insights", text: "Sieh, wie viele Gäste du durch Performance-Probleme verlierst." },
              ].map(({ icon, title, text }) => (
                <div key={title} className="cl-sol-card">
                  <div className="cl-sol-icon">{icon}</div>
                  <div className="cl-sol-title">{title}</div>
                  <p className="cl-sol-text">{text}</p>
                </div>
              ))}
            </div>
            <button className="cl-btn-primary" style={{ margin: "0 auto", display: "block" }} onClick={() => goTo(6)}>
              Jetzt kostenlos analysieren →
            </button>
          </div>
          <div className="cl-scroll-hint">
            <span>Scroll</span>
            <div className="cl-arrow cl-arrow--light" />
          </div>
        </section>

        {/* ── S7: CTA (teal) ── */}
        <section
          ref={(el) => { sectionsRef.current[6] = el; }}
          className="cl-section cl-s7"
        >
          <div className="cl-cta-blob cl-cta-blob-1" />
          <div className="cl-cta-blob cl-cta-blob-2" />
          <div className="cl-cta-inner">
            <div className="cl-cta-label">Kostenlos · Keine Kreditkarte · 30 Sekunden</div>
            <h2 className="cl-cta-h2">
              Dein Restaurant-Check.<br />Starte jetzt.
            </h2>
            <p className="cl-cta-sub">
              Gib deine Website oder deinen Google Maps Link ein. Wir zeigen dir
              in Sekunden, wo du täglich Gäste verlierst — und wie du sie zurückgewinnst.
            </p>
            <div className="cl-cta-input-wrap">
              <input
                type="text"
                value={ctaUrl}
                onChange={(e) => { setCtaUrl(e.target.value); setUrlError(null); }}
                placeholder="https://dein-restaurant.de oder Google Maps Link"
                disabled={isLoading}
              />
              <button
                className="cl-btn-white"
                onClick={() => submitToN8n(ctaUrl)}
                disabled={isLoading || !ctaUrl}
              >
                {isLoading ? "Analysiere…" : "Analysieren"}
              </button>
            </div>
            {urlError && <p style={{ color: "rgba(255,255,255,.8)", fontSize: 13, marginTop: 8 }}>{urlError}</p>}
            <p className="cl-cta-note">
              ✓ Kostenlos &nbsp;·&nbsp; ✓ Kein Account nötig &nbsp;·&nbsp; ✓ Sofort-Ergebnis
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   All CSS (scoped via "cl-" prefix)
───────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Poppins:wght@300;400;500;600&display=swap');

:root {
  --cl-teal: #0d9488;
  --cl-teal-l: #14b8a6;
  --cl-teal-xl: #ccfbf1;
  --cl-teal-faint: #f0fdf9;
  --cl-dark: #0f172a;
  --cl-muted: #64748b;
  --cl-border: #e2e8f0;
  --cl-white: #ffffff;
  --cl-surface: #f8fafc;
  --cl-red: #dc2626;
  --cl-amber: #d97706;
  --cl-green: #059669;
}

/* Noise overlay */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  background-size: 256px 256px;
  mix-blend-mode: overlay;
}

/* ── NAV ── */
.cl-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  height: 64px;
  background: rgba(255,255,255,.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(226,232,240,.8);
}
/* Gradient logo matching main landing page */
.cl-logo-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.cl-logo-gradient {
  font-family: "Space Grotesk", system-ui;
  font-weight: 900;
  font-size: 22px;
  letter-spacing: -.04em;
  background: linear-gradient(45deg, #14b8a6, #8b5cf6, #f97316);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: cl-logo-anim 6s ease infinite;
  cursor: pointer;
}
.cl-logo-dot {
  position: absolute;
  top: -3px;
  right: -6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #14b8a6, #8b5cf6);
  animation: cl-logo-dot-bounce 2s ease-in-out infinite;
}
@keyframes cl-logo-anim {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes cl-logo-dot-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* Input error */
.cl-input-error {
  margin-top: 10px;
  font-family: "Poppins", system-ui;
  font-size: 12px;
  color: var(--cl-red);
  text-align: center;
}
.cl-nav-cta {
  background: var(--cl-teal);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 20px;
  font-family: "Poppins", system-ui;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}
.cl-nav-cta:hover { background: var(--cl-teal-l); transform: translateY(-1px); }

/* ── DOT NAV ── */
.cl-dots {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cl-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: rgba(15,23,42,.2);
  border: 1px solid rgba(15,23,42,.1);
  cursor: pointer;
  transition: all .3s;
  padding: 0;
}
.cl-dot--active {
  background: var(--cl-teal);
  transform: scale(1.4);
  border-color: var(--cl-teal);
}
.cl-dots--dark .cl-dot {
  background: rgba(255,255,255,.25);
  border-color: rgba(255,255,255,.15);
}
.cl-dots--dark .cl-dot.cl-dot--active {
  background: #fff;
  border-color: #fff;
}

/* ── SCROLL CONTAINER ── */
.cl-scroll-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

/* ── SECTION BASE ── */
.cl-section {
  scroll-snap-align: start;
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── SCROLL HINT ── */
.cl-scroll-hint {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 10;
}
.cl-scroll-hint span {
  font-family: "Poppins", system-ui;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: rgba(15,23,42,.3);
}
.cl-arrow {
  width: 24px; height: 24px;
  transform: rotate(45deg);
  animation: cl-bounce 1.5s ease-in-out infinite;
}
.cl-arrow--light {
  border-right: 1.5px solid rgba(15,23,42,.25);
  border-bottom: 1.5px solid rgba(15,23,42,.25);
}
.cl-arrow--dark {
  border-right: 1.5px solid rgba(255,255,255,.25);
  border-bottom: 1.5px solid rgba(255,255,255,.25);
}

/* ═══════════════════════════════════
   S1: HERO (light)
═══════════════════════════════════ */
.cl-s1 { background: var(--cl-teal-faint); }
.cl-grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(13,148,136,.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13,148,136,.06) 1px, transparent 1px);
  background-size: 48px 48px;
}
.cl-hero-glow {
  position: absolute;
  bottom: -20%; left: 50%;
  transform: translateX(-50%);
  width: 80vw; height: 50vw;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(13,148,136,.12) 0%, transparent 70%);
  pointer-events: none;
}
.cl-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 680px;
  padding: 0 24px;
}
.cl-hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(13,148,136,.1);
  border: 1px solid rgba(13,148,136,.25);
  border-radius: 100px;
  padding: 6px 18px;
  margin-bottom: 32px;
}
.cl-tag-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--cl-teal);
  box-shadow: 0 0 8px var(--cl-teal);
  animation: cl-pulse 2s ease-in-out infinite;
}
.cl-tag-txt {
  font-family: "Poppins", system-ui;
  font-size: 11px;
  font-weight: 600;
  color: var(--cl-teal);
  text-transform: uppercase;
  letter-spacing: .1em;
}
.cl-hero-h1 {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: clamp(2.8rem, 6vw, 4.4rem);
  line-height: 1.05;
  letter-spacing: -.03em;
  color: var(--cl-dark);
  margin-bottom: 24px;
}
.cl-hero-h1 em {
  font-style: normal;
  background: linear-gradient(135deg, var(--cl-teal) 0%, var(--cl-teal-l) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.cl-hero-sub {
  font-family: "Poppins", system-ui;
  font-size: 17px;
  color: var(--cl-muted);
  line-height: 1.7;
  margin-bottom: 40px;
  font-weight: 400;
}
.cl-input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1.5px solid var(--cl-border);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,.06);
  transition: border-color .2s, box-shadow .2s;
  max-width: 560px;
  margin: 0 auto;
}
.cl-input-wrap:focus-within {
  border-color: var(--cl-teal);
  box-shadow: 0 0 0 3px rgba(13,148,136,.12);
}
.cl-input-wrap input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--cl-dark);
  font-family: "Poppins", system-ui;
  font-size: 15px;
  padding: 11px 16px;
}
.cl-input-wrap input::placeholder { color: #94a3b8; }
.cl-btn-primary {
  background: linear-gradient(135deg, var(--cl-teal) 0%, var(--cl-teal-l) 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-family: "Poppins", system-ui;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(13,148,136,.35);
  transition: all .2s;
  white-space: nowrap;
}
.cl-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(13,148,136,.45); }
.cl-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  font-family: "Poppins", system-ui;
  font-size: 12px;
  color: var(--cl-muted);
}
.cl-trust span { display: flex; align-items: center; gap: 5px; }
.cl-trust-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--cl-border); }
.cl-trust-check { color: var(--cl-green); font-weight: 600; }

/* Floating pills */
.cl-pill {
  position: absolute;
  background: #fff;
  border: 1px solid var(--cl-border);
  border-radius: 100px;
  padding: 8px 16px;
  font-family: "Poppins", system-ui;
  font-size: 12px;
  font-weight: 500;
  color: var(--cl-dark);
  box-shadow: 0 4px 16px rgba(0,0,0,.07);
  white-space: nowrap;
}
.cl-pill-1 { top: 22%; left: 6%; animation: cl-float1 5s ease-in-out infinite; border-left: 3px solid var(--cl-red); }
.cl-pill-2 { top: 18%; right: 7%; animation: cl-float2 6s ease-in-out 1s infinite; border-left: 3px solid var(--cl-green); }
.cl-pill-3 { bottom: 24%; left: 8%; animation: cl-float3 4.5s ease-in-out .5s infinite; border-left: 3px solid var(--cl-amber); }
.cl-pill-4 { bottom: 28%; right: 6%; animation: cl-float1 5.5s ease-in-out 1.5s infinite; border-left: 3px solid var(--cl-teal); }

/* Fade-up animation */
.cl-fu { opacity: 0; animation: cl-fade-up .7s ease forwards; }
.cl-d1 { animation-delay: .1s; }
.cl-d2 { animation-delay: .2s; }
.cl-d3 { animation-delay: .35s; }
.cl-d4 { animation-delay: .5s; }
.cl-d5 { animation-delay: .65s; }

/* ═══════════════════════════════════
   S2: INSIGHT (teal)
═══════════════════════════════════ */
.cl-s2 { background: var(--cl-teal); }
.cl-s2-inner {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  padding: 0 80px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 80px;
}
.cl-s2-blob {
  position: absolute;
  bottom: -25%; right: -15%;
  width: 60vw; height: 60vw;
  border-radius: 50%;
  background: rgba(255,255,255,.05);
  pointer-events: none;
}
.cl-big-num {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: clamp(7rem, 16vw, 13rem);
  line-height: .9;
  letter-spacing: -.04em;
  position: relative;
}
.cl-big-num--ghost { color: rgba(255,255,255,.12); }
.cl-big-num--reveal {
  position: absolute; inset: 0;
  color: #fff;
  clip-path: inset(0 100% 0 0);
  transition: clip-path 1.4s cubic-bezier(.77,0,.18,1);
}
.cl-big-num--revealed { clip-path: inset(0 0% 0 0); }
.cl-s2-text .cl-section-label {
  font-family: "Poppins", system-ui;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: rgba(255,255,255,.6);
  margin-bottom: 16px;
}
.cl-s2-text h2 {
  font-family: "Space Grotesk", system-ui;
  font-weight: 700;
  font-size: clamp(1.6rem, 2.8vw, 2.2rem);
  color: #fff;
  margin-bottom: 16px;
  letter-spacing: -.02em;
  line-height: 1.25;
}
.cl-s2-text p {
  font-family: "Poppins", system-ui;
  font-size: 15px;
  color: rgba(255,255,255,.65);
  line-height: 1.75;
}

/* ═══════════════════════════════════
   STORY SECTIONS (S3, S4, S5)
═══════════════════════════════════ */
.cl-s3 { background: #111827; }
.cl-s4 { background: #0a0f1a; }
.cl-s5 { background: #111827; }
.cl-story {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  max-width: 1200px;
  align-items: center;
  gap: 80px;
  padding: 0 80px;
  position: relative;
  z-index: 2;
}
.cl-section-label {
  font-family: "Poppins", system-ui;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--cl-teal-l);
  margin-bottom: 14px;
}
.cl-label--light { color: rgba(255,255,255,.45); }
.cl-story-num {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: clamp(2.8rem, 6vw, 5rem);
  line-height: 1;
  letter-spacing: -.03em;
  margin-bottom: 20px;
  color: #fff;
}
.cl-unit { font-size: .45em; color: rgba(255,255,255,.35); font-weight: 600; }
.cl-story-body {
  font-family: "Poppins", system-ui;
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255,255,255,.6);
  max-width: 420px;
}
.cl-story-body strong { color: #fff; }
.cl-story-visual { display: flex; align-items: center; justify-content: center; }

/* ── Speed bars ── */
.cl-speed-visual { display: flex; flex-direction: column; gap: 18px; width: 300px; }
.cl-speed-title {
  font-family: "Poppins", system-ui;
  font-size: 11px;
  color: rgba(255,255,255,.3);
  text-transform: uppercase;
  letter-spacing: .1em;
  margin-bottom: 4px;
}
.cl-speed-row { display: flex; align-items: center; gap: 12px; }
.cl-speed-lbl {
  font-family: "Poppins", system-ui;
  font-size: 12px;
  color: rgba(255,255,255,.45);
  width: 80px;
  text-align: right;
  flex-shrink: 0;
}
.cl-speed-track {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,.06);
  border-radius: 4px;
  overflow: hidden;
}
.cl-speed-fill { height: 100%; border-radius: 4px; }
.cl-speed-val {
  font-family: "Space Grotesk", system-ui;
  font-size: 12px;
  font-weight: 700;
  width: 40px;
  flex-shrink: 0;
}
.cl-speed-note {
  background: rgba(220,38,38,.08);
  border: 1px solid rgba(220,38,38,.18);
  border-radius: 10px;
  padding: 12px 16px;
  font-family: "Poppins", system-ui;
  font-size: 12px;
  color: rgba(255,255,255,.5);
  line-height: 1.6;
  margin-top: 8px;
}
.cl-speed-note strong { color: #fff; font-size: 15px; }

/* ── Phone mockup ── */
.cl-phone-mockup { position: relative; }
.cl-phone-frame {
  width: 240px;
  height: 460px;
  background: #1e293b;
  border-radius: 32px;
  border: 2px solid rgba(255,255,255,.1);
  overflow: hidden;
  box-shadow: 0 40px 80px rgba(0,0,0,.6);
  animation: cl-float-phone 6s ease-in-out infinite;
}
.cl-phone-screen { padding: 20px 16px; height: 100%; display: flex; flex-direction: column; }
.cl-phone-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.cl-phone-logo {
  font-family: "Space Grotesk", system-ui;
  font-weight: 700;
  font-size: 16px;
  color: #fff;
}
.cl-phone-logo span { color: var(--cl-teal-l); }
.cl-phone-menu-btn { color: rgba(255,255,255,.6); font-size: 18px; cursor: pointer; }
.cl-phone-hero-img {
  width: 100%;
  height: 140px;
  background: linear-gradient(135deg, #0d9488, #0a0f1a);
  border-radius: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.cl-phone-content { flex: 1; }
.cl-phone-content h3 {
  font-family: "Space Grotesk", system-ui;
  font-weight: 700;
  font-size: 18px;
  color: #fff;
  margin-bottom: 4px;
}
.cl-phone-content p {
  font-family: "Poppins", system-ui;
  font-size: 12px;
  color: rgba(255,255,255,.5);
  margin-bottom: 16px;
}
.cl-phone-cta {
  width: 100%;
  background: var(--cl-teal);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-family: "Poppins", system-ui;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 8px;
  text-align: center;
}
.cl-phone-menu {
  width: 100%;
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.7);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  padding: 10px;
  font-family: "Poppins", system-ui;
  font-size: 13px;
  cursor: pointer;
  text-align: center;
}
.cl-phone-badge {
  position: absolute;
  bottom: 20px;
  right: -24px;
  background: linear-gradient(135deg, #14b8a6, #8b5cf6);
  border-radius: 100px;
  padding: 7px 16px;
  font-family: "Poppins", system-ui;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(13,148,136,.5);
  letter-spacing: .03em;
}

/* ── iPhone 16 Pro Mockup ── */
.cl-iphone-wrap {
  position: relative;
  animation: cl-float-phone 6s ease-in-out infinite;
}
.cl-iphone-outer {
  width: 260px;
  height: 530px;
  background: linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 50%, #111 100%);
  border-radius: 46px;
  border: 1.5px solid rgba(255,255,255,.12);
  box-shadow:
    0 0 0 1px rgba(0,0,0,.8),
    0 40px 80px rgba(0,0,0,.7),
    inset 0 1px 0 rgba(255,255,255,.1);
  position: relative;
  overflow: hidden;
  padding: 10px;
}
/* Side buttons */
.cl-iphone-btn {
  position: absolute;
  background: linear-gradient(180deg, #333 0%, #222 100%);
  border-radius: 3px;
}
.cl-iphone-btn--power {
  right: -2px; top: 110px;
  width: 3px; height: 60px;
}
.cl-iphone-btn--vol1 {
  left: -2px; top: 130px;
  width: 3px; height: 40px;
}
.cl-iphone-btn--vol2 {
  left: -2px; top: 180px;
  width: 3px; height: 40px;
}
/* Screen */
.cl-iphone-screen {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 38px;
  overflow: hidden;
  position: relative;
}
/* Dynamic Island */
.cl-iphone-island {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 96px;
  height: 26px;
  background: #000;
  border-radius: 20px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.cl-iphone-island-speaker {
  width: 48px;
  height: 6px;
  background: #1a1a1a;
  border-radius: 9999px;
}
.cl-iphone-island-cam {
  width: 10px;
  height: 10px;
  background: radial-gradient(circle at 30% 30%, rgba(80,180,255,.6), #000);
  border-radius: 50%;
}
/* App inside phone - cream refero.design style */
.cl-iphone-app {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #faf5ef;
  padding-top: 48px;
  overflow: hidden;
}
/* App Header */
.cl-app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 8px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.cl-app-logo-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cl-app-icon {
  font-size: 14px;
  background: #f0e8de;
  border-radius: 8px;
  padding: 3px 5px;
  line-height: 1;
}
.cl-app-logo {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: 15px;
  color: #0f172a;
  letter-spacing: -.02em;
}
.cl-app-hamburger {
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
}
.cl-app-hamburger span {
  display: block;
  width: 16px;
  height: 1.5px;
  background: #0f172a;
  border-radius: 2px;
}
/* Speisekarte heading */
.cl-app-menu-title {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: 22px;
  color: #0f172a;
  letter-spacing: -.03em;
  padding: 14px 16px 6px;
  flex-shrink: 0;
  background: #faf5ef;
}
/* Category pills */
.cl-app-pills {
  display: flex;
  gap: 6px;
  padding: 6px 12px 10px;
  background: #faf5ef;
  flex-shrink: 0;
  overflow: hidden;
}
.cl-app-pill {
  font-family: "Space Grotesk", system-ui;
  font-size: 9px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 100px;
  background: #fff;
  color: #0f172a;
  white-space: nowrap;
  border: 1.5px solid #e8e0d5;
}
.cl-app-pill--active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
/* Scrollable menu area */
.cl-app-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 12px 12px;
  scrollbar-width: none;
}
.cl-app-scroll::-webkit-scrollbar { display: none; }
/* Section headers */
.cl-app-section-head {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: 13px;
  color: #0f172a;
  padding: 10px 0 6px;
  border-bottom: 1px solid #e8e0d5;
  margin-bottom: 8px;
  letter-spacing: -.01em;
}
/* Refero-style menu items */
.cl-app-item-rf {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  background: #fff;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
}
.cl-app-item-name {
  font-family: "Space Grotesk", system-ui;
  font-weight: 700;
  font-size: 11px;
  color: #0f172a;
  margin-bottom: 3px;
}
.cl-app-item-desc {
  font-family: "Poppins", system-ui;
  font-size: 8.5px;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 5px;
}
.cl-app-item-tag {
  display: inline-block;
  font-family: "Poppins", system-ui;
  font-size: 8px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 100px;
  padding: 2px 7px;
}
.cl-app-item-price {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: 12px;
  color: #0f172a;
  white-space: nowrap;
  flex-shrink: 0;
  padding-top: 1px;
}

/* ── Global scrollbar hide ── */
* { scrollbar-width: none; }
*::-webkit-scrollbar { display: none; }

/* ── Stat source citation ── */
.cl-source {
  font-family: "Poppins", system-ui;
  font-size: 10px;
  color: rgba(255,255,255,.3);
  margin-top: 6px;
  letter-spacing: .01em;
}
.cl-source--dark {
  color: rgba(15,23,42,.35);
}


.cl-reviews { display: flex; flex-direction: column; gap: 12px; width: 280px; }
.cl-big-rating {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: 80px;
  color: #fff;
  line-height: 1;
}
.cl-stars-row { display: flex; gap: 3px; margin-bottom: 8px; }
.cl-star {
  width: 20px; height: 20px;
  background: var(--cl-amber);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
.cl-star--half {
  background: linear-gradient(90deg, var(--cl-amber) 50%, rgba(255,255,255,.15) 50%);
}
.cl-rev-card {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  padding: 12px 14px;
}
.cl-rev-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.cl-rev-av {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: rgba(255,255,255,.12);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Space Grotesk", system-ui;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,.6);
}
.cl-rev-name {
  font-family: "Poppins", system-ui;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,.8);
}
.cl-rev-star {
  width: 10px; height: 10px;
  background: var(--cl-amber);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
.cl-rev-text {
  font-family: "Poppins", system-ui;
  font-size: 12px;
  color: rgba(255,255,255,.4);
  line-height: 1.5;
  font-style: italic;
  margin: 0;
}

/* ═══════════════════════════════════
   S6: SOLUTION (light)
═══════════════════════════════════ */
.cl-s6 {
  background: var(--cl-teal-faint);
  height: auto;
  min-height: 100vh;
  padding: 100px 0 60px;
  align-items: flex-start;
}
.cl-solution-inner {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 40px;
  width: 100%;
}
.cl-solution-h2 {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: clamp(2rem, 4.5vw, 3.4rem);
  letter-spacing: -.03em;
  color: var(--cl-dark);
  margin-bottom: 16px;
  line-height: 1.1;
}
.cl-solution-h2 em { font-style: normal; color: var(--cl-teal); }
.cl-solution-sub {
  font-family: "Poppins", system-ui;
  font-size: 17px;
  color: var(--cl-muted);
  line-height: 1.7;
  margin-bottom: 48px;
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}
.cl-sol-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 48px;
}
.cl-sol-card {
  background: #fff;
  border: 1px solid var(--cl-border);
  border-radius: 16px;
  padding: 24px 20px;
  text-align: left;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
  transition: border-color .25s, transform .25s, box-shadow .25s;
  cursor: default;
}
.cl-sol-card:hover {
  border-color: var(--cl-teal);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(13,148,136,.12);
}
.cl-sol-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: var(--cl-teal-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.cl-sol-icon svg { width: 18px; height: 18px; stroke: var(--cl-teal); stroke-width: 2; fill: none; }
.cl-sol-title {
  font-family: "Space Grotesk", system-ui;
  font-weight: 700;
  font-size: 15px;
  color: var(--cl-dark);
  margin-bottom: 8px;
}
.cl-sol-text {
  font-family: "Poppins", system-ui;
  font-size: 13px;
  color: var(--cl-muted);
  line-height: 1.6;
  margin: 0;
}

/* ═══════════════════════════════════
   S7: CTA (teal)
═══════════════════════════════════ */
.cl-s7 { background: var(--cl-teal); }
.cl-cta-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.cl-cta-blob-1 {
  width: 60vw; height: 60vw;
  background: rgba(255,255,255,.06);
  top: -30%; right: -20%;
}
.cl-cta-blob-2 {
  width: 40vw; height: 40vw;
  background: rgba(0,0,0,.08);
  bottom: -20%; left: -10%;
}
.cl-cta-inner {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 680px;
  padding: 0 24px;
}
.cl-cta-label {
  font-family: "Poppins", system-ui;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: rgba(255,255,255,.65);
  margin-bottom: 16px;
}
.cl-cta-h2 {
  font-family: "Space Grotesk", system-ui;
  font-weight: 800;
  font-size: clamp(2.5rem, 5vw, 4rem);
  letter-spacing: -.03em;
  color: #fff;
  margin-bottom: 18px;
  line-height: 1.05;
}
.cl-cta-sub {
  font-family: "Poppins", system-ui;
  font-size: 16px;
  color: rgba(255,255,255,.7);
  margin-bottom: 40px;
  line-height: 1.65;
}
.cl-cta-input-wrap {
  display: flex;
  gap: 8px;
  background: rgba(255,255,255,.15);
  border: 1.5px solid rgba(255,255,255,.25);
  border-radius: 14px;
  padding: 6px;
  max-width: 520px;
  margin: 0 auto 16px;
  backdrop-filter: blur(8px);
}
.cl-cta-input-wrap:focus-within { border-color: rgba(255,255,255,.6); }
.cl-cta-input-wrap input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-family: "Poppins", system-ui;
  font-size: 15px;
  padding: 11px 16px;
}
.cl-cta-input-wrap input::placeholder { color: rgba(255,255,255,.4); }
.cl-btn-white {
  background: #fff;
  color: var(--cl-teal);
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-family: "Poppins", system-ui;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
  white-space: nowrap;
}
.cl-btn-white:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,.12); }
.cl-cta-note {
  font-family: "Poppins", system-ui;
  font-size: 12px;
  color: rgba(255,255,255,.5);
  margin: 0;
}

/* ═══════════════════════════════════
   KEYFRAMES
═══════════════════════════════════ */
@keyframes cl-float1 {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-12px) rotate(-2deg); }
}
@keyframes cl-float2 {
  0%, 100% { transform: translateY(0) rotate(2deg); }
  50% { transform: translateY(-16px) rotate(2deg); }
}
@keyframes cl-float3 {
  0%, 100% { transform: translateY(-4px) rotate(-1deg); }
  50% { transform: translateY(8px) rotate(-1deg); }
}
@keyframes cl-bounce {
  0%, 100% { transform: rotate(45deg) translateY(0); }
  50% { transform: rotate(45deg) translateY(5px); }
}
@keyframes cl-pulse {
  0%, 100% { opacity: .5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.4); }
}
@keyframes cl-fade-up {
  from { opacity: 0; transform: translateY(32px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cl-float-phone {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(.5deg); }
}

/* ═══════════════════════════════════
   RESPONSIVE
═══════════════════════════════════ */
@media (max-width: 768px) {
  .cl-nav { padding: 0 20px; }
  .cl-s2-inner { grid-template-columns: 1fr; padding: 0 28px; gap: 24px; }
  .cl-story { grid-template-columns: 1fr; padding: 0 28px; gap: 24px; }
  .cl-story-visual { display: none; }
  .cl-sol-grid { grid-template-columns: 1fr; }
  .cl-pill-1, .cl-pill-3 { display: none; }
  .cl-dots { display: none; }
}
`;
