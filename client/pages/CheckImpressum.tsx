import React from "react";
import "./check.css"; // We use the check styling

export default function CheckImpressum() {
    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#0a0f1a", // Check app background
            color: "#e2e8f0",
            fontFamily: "system-ui, sans-serif",
            padding: "0",
        }}>
            {/* ── NAV ── */}
            <nav className="ck-nav">
                <div className="ck-nav-inner">
                    <div
                        className="ck-logo-wrap"
                        onClick={() => (window.location.href = "/check-landing")}
                        style={{ cursor: "pointer" }}
                    >
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
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
                        <a className="ck-nav-link" href="/check-landing" style={{ color: "#475569" }}>
                            ← Zurück
                        </a>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div style={{
                maxWidth: "680px",
                margin: "0 auto",
                padding: "120px 40px 120px",
            }}>
                {/* Title */}
                <div style={{ marginBottom: "56px" }}>
                    <p style={{
                        fontSize: "11px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "#14b8a6",
                        fontFamily: "system-ui, sans-serif",
                        marginBottom: "16px",
                        fontWeight: "600",
                    }}>
                        Rechtliches
                    </p>
                    <h1 style={{
                        fontSize: "42px",
                        fontWeight: "800",
                        letterSpacing: "-0.03em",
                        color: "#f8fafc",
                        margin: "0",
                        lineHeight: "1.2",
                    }}>
                        Impressum
                    </h1>
                </div>

                {/* Angaben gemäß § 5 TMG */}
                <Section title="Angaben gemäß § 5 TMG">
                    <p>Julian Heinrich<br />
                        Hansaring 37<br />
                        48155 Münster</p>
                </Section>

                <Divider />

                {/* Kontakt */}
                <Section title="Kontakt">
                    <p>
                        Telefon: <a href="tel:+4917632011307" style={{ color: "#14b8a6", textDecoration: "none" }}>017632011307</a><br />
                        E-Mail: <a href="mailto:julian.heinrich@maitr.de" style={{ color: "#14b8a6", textDecoration: "none" }}>julian.heinrich@maitr.de</a>
                    </p>
                </Section>

                <Divider />

                {/* EU-Streitschlichtung */}
                <Section title="EU-Streitschlichtung">
                    <p>
                        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
                        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer" style={{ color: "#14b8a6" }}>
                            https://ec.europa.eu/consumers/odr/
                        </a>.
                        Unsere E-Mail-Adresse finden Sie oben im Impressum.
                    </p>
                </Section>

                <Divider />

                {/* Verbraucherstreitbeilegung */}
                <Section title="Verbraucherstreitbeilegung / Universalschlichtungsstelle">
                    <p>
                        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
                        Verbraucherschlichtungsstelle teilzunehmen.
                    </p>
                </Section>

                {/* Source */}
                <div style={{ marginTop: "64px", paddingTop: "32px", borderTop: "1px solid #1e293b" }}>
                    <p style={{ fontSize: "12px", color: "#64748b", fontFamily: "system-ui, sans-serif" }}>
                        Quelle:{" "}
                        <a href="https://www.e-recht24.de/impressum-generator.html" target="_blank" rel="noreferrer" style={{ color: "#64748b" }}>
                            e-recht24.de
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: "40px" }}>
            <h2 style={{
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#94a3b8",
                fontFamily: "system-ui, sans-serif",
                fontWeight: "600",
                marginBottom: "16px",
                margin: "0 0 16px 0",
            }}>
                {title}
            </h2>
            <div style={{
                fontSize: "15px",
                lineHeight: "1.8",
                color: "#cbd5e1",
                fontFamily: "system-ui, sans-serif",
            }}>
                {children}
            </div>
        </div>
    );
}

function Divider() {
    return (
        <div style={{
            height: "1px",
            backgroundColor: "#1e293b",
            margin: "40px 0",
        }} />
    );
}
