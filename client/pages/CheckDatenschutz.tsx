import React, { useState } from "react";
import "./check.css"; // We use the check styling

export default function CheckDatenschutz() {
    const [activeSection, setActiveSection] = useState("ueberblick");

    const sections = [
        { id: "ueberblick", label: "1. Überblick" },
        { id: "hosting", label: "2. Hosting" },
        { id: "allgemein", label: "3. Allgemeine Hinweise" },
        { id: "erfassung", label: "4. Datenerfassung" },
        { id: "dienste", label: "5. Dienste & Tools" },
    ];

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#0a0f1a", // Check app background
            color: "#e2e8f0",
            fontFamily: "system-ui, sans-serif",
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

            <div style={{ display: "flex", maxWidth: "1100px", margin: "0 auto", padding: "0 40px" }}>
                {/* Sidebar Navigation */}
                <div style={{
                    width: "220px",
                    flexShrink: 0,
                    paddingTop: "120px",
                    paddingRight: "48px",
                    position: "sticky",
                    top: "0px",
                    height: "100vh",
                    overflowY: "auto",
                }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#14b8a6", marginBottom: "20px" }}>
                        Inhalt
                    </p>
                    {sections.map(s => (
                        <a
                            key={s.id}
                            href={`#${s.id}`}
                            onClick={() => setActiveSection(s.id)}
                            style={{
                                display: "block",
                                fontSize: "12px",
                                color: activeSection === s.id ? "#f8fafc" : "#64748b",
                                textDecoration: "none",
                                padding: "8px 0",
                                borderLeft: `2px solid ${activeSection === s.id ? "#14b8a6" : "#1e293b"}`,
                                paddingLeft: "12px",
                                transition: "all 0.2s",
                            }}
                        >
                            {s.label}
                        </a>
                    ))}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, paddingTop: "120px", paddingBottom: "120px" }}>
                    <div style={{ marginBottom: "56px" }}>
                        <p style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#14b8a6", marginBottom: "16px" }}>
                            Rechtliches
                        </p>
                        <h1 style={{ fontSize: "42px", fontWeight: "800", letterSpacing: "-0.03em", margin: 0 }}>
                            Datenschutzerklärung
                        </h1>
                    </div>

                    {/* 1. Überblick */}
                    <Section id="ueberblick" title="1. Datenschutz auf einen Blick">
                        <SubHeading>Allgemeine Hinweise</SubHeading>
                        <P>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website (check.maitr.de) besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</P>

                        <SubHeading>Datenerfassung auf dieser Website</SubHeading>
                        <P><strong>Wer ist verantwortlich für die Datenerfassung?</strong><br />
                            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" entnehmen.</P>

                        <P><strong>Wie erfassen wir Ihre Daten?</strong><br />
                            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen (z. B. Eingabe einer URL zur Analyse). Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst (technische Daten wie Browser, Betriebssystem, IP-Adresse).</P>

                        <P><strong>Wofür nutzen wir Ihre Daten?</strong><br />
                            Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens und zur technischen Website-Analyse der von Ihnen eingegebenen URLs verwendet werden. Der Check-Service sendet die URL an einen n8n-Server zur Automatisierungsanalyse und Auswertung.</P>

                        <P><strong>Welche Rechte haben Sie bezüglich Ihrer Daten?</strong><br />
                            Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht auf Berichtigung oder Löschung sowie das Recht auf Einschränkung der Verarbeitung. Außerdem haben Sie ein Beschwerderecht bei der zuständigen Aufsichtsbehörde.</P>
                    </Section>

                    <Hr />

                    {/* 2. Hosting */}
                    <Section id="hosting" title="2. Hosting">
                        <SubHeading>Netlify (Frontend-Hosting)</SubHeading>
                        <P>Diese Website wird über Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, USA gehostet. Netlify verarbeitet dabei Verbindungsdaten (IP-Adressen, Log-Dateien) auf Basis eines Auftragsverarbeitungsvertrags. Die Übermittlung in die USA erfolgt auf Basis des EU-US Data Privacy Framework.</P>

                        <SubHeading>Railway (Backend-Hosting)</SubHeading>
                        <P>Das Backend dieser Website wird über Railway Corporation, 548 Market St PMB 68956, San Francisco, CA 94104, USA betrieben. Railway verarbeitet dabei technische Daten zur Bereitstellung des Dienstes. Die Übermittlung in die USA erfolgt auf Basis der EU-Standardvertragsklauseln (Art. 46 DSGVO).</P>

                        <InfoBox>
                            Wir haben mit beiden Hostern Verträge zur Auftragsverarbeitung (AVV) geschlossen. Diese gewährleisten, dass die personenbezogenen Daten unserer Websitebesucher nur nach unseren Weisungen und unter Einhaltung der DSGVO verarbeitet werden.
                        </InfoBox>
                    </Section>

                    <Hr />

                    {/* 3. Allgemeine Hinweise */}
                    <Section id="allgemein" title="3. Allgemeine Hinweise und Pflichtinformationen">
                        <SubHeading>Datenschutz</SubHeading>
                        <P>Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</P>

                        <SubHeading>Hinweis zur verantwortlichen Stelle</SubHeading>
                        <P>
                            Julian Heinrich<br />
                            Hansaring 37, 48155 Münster<br />
                            Telefon: 017632011307<br />
                            E-Mail: <a href="mailto:julian.heinrich@maitr.de" style={{ color: "#14b8a6" }}>julian.heinrich@maitr.de</a>
                        </P>

                        <SubHeading>Speicherdauer</SubHeading>
                        <P>Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung widerrufen, werden Ihre Daten gelöscht, sofern keine anderen rechtlich zulässigen Gründe vorliegen.</P>

                        <SubHeading>Beschwerderecht bei der zuständigen Aufsichtsbehörde</SubHeading>
                        <P>Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu. Zuständige Aufsichtsbehörde für Nordrhein-Westfalen ist die Landesbeauftragte für Datenschutz und Informationsfreiheit NRW.</P>
                    </Section>

                    <Hr />

                    {/* 4. Datenerfassung */}
                    <Section id="erfassung" title="4. Datenerfassung auf dieser Website">
                        <SubHeading>Cookies</SubHeading>
                        <P>Unsere Internetseiten verwenden Cookies. Cookies sind kleine Datenpakete, die auf Ihrem Endgerät gespeichert werden. Technisch notwendige Cookies werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert. Für alle anderen Cookies holen wir Ihre Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO ein. Sie können Cookies in Ihrem Browser jederzeit löschen oder deaktivieren.</P>

                        <SubHeading>Server-Log-Dateien</SubHeading>
                        <P>Der Provider der Seiten erhebt und speichert automatisch Informationen in Server-Log-Dateien: Browsertyp und -version, Betriebssystem, Referrer URL, Hostname, Uhrzeit der Serveranfrage, IP-Adresse. Eine Zusammenführung mit anderen Datenquellen wird nicht vorgenommen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</P>

                        <SubHeading>Automatisierungs-Analyse (n8n)</SubHeading>
                        <P>Wenn Sie auf unserer Check-Seite eine URL eingeben, um diese analysieren zu lassen, wird diese URL an unseren Automatisierungsservice übermittelt, der in der Regel auf n8n betrieben wird. Dort werden öffentliche Daten der eingegebenen Website analysiert. Es werden in diesem Zusammenhang keine personenbezogenen Daten von Ihnen außer Ihrer IP-Adresse für die technische Übertragung und ggf. Session-Daten für die Zuordnung Ihres Checks übertragen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</P>
                    </Section>

                    <Hr />

                    {/* Footer */}
                    <div style={{ marginTop: "64px", paddingTop: "32px", borderTop: "1px solid #1e293b" }}>
                        <p style={{ fontSize: "12px", color: "#64748b" }}>
                            Quelle:{" "}
                            <a href="https://www.e-recht24.de" target="_blank" rel="noreferrer" style={{ color: "#64748b" }}>
                                e-recht24.de
                            </a>{" "}· Zuletzt aktualisiert: {new Date().toLocaleDateString("de-DE")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <div id={id} style={{ marginBottom: "48px", scrollMarginTop: "100px" }}>
            <h2 style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#f8fafc",
                marginBottom: "28px",
                paddingBottom: "16px",
                borderBottom: "1px solid #1e293b",
            }}>
                {title}
            </h2>
            {children}
        </div>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#94a3b8",
            fontWeight: "600",
            marginBottom: "10px",
            marginTop: "28px",
            fontFamily: "system-ui, sans-serif",
        }}>
            {children}
        </h3>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: "14px",
            lineHeight: "1.8",
            color: "#cbd5e1",
            marginBottom: "16px",
            marginTop: "0",
        }}>
            {children}
        </p>
    );
}

function Hr() {
    return <div style={{ height: "1px", backgroundColor: "#1e293b", margin: "48px 0" }} />;
}

function InfoBox({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            borderLeft: "2px solid #14b8a6",
            paddingLeft: "16px",
            marginTop: "20px",
            marginBottom: "16px",
            backgroundColor: "rgba(20, 184, 166, 0.05)",
            padding: "16px",
            borderRadius: "0 8px 8px 0"
        }}>
            <p style={{ fontSize: "13px", lineHeight: "1.7", color: "#94a3b8", margin: 0 }}>
                {children}
            </p>
        </div>
    );
}
