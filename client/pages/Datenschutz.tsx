import { PageSEO } from "@/components/seo/PageSEO";
import React, { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, Shield } from "lucide-react";

const sections = [
  { id: "ueberblick",   label: "1. Datenschutz auf einen Blick" },
  { id: "hosting",      label: "2. Hosting & Infrastruktur" },
  { id: "allgemein",    label: "3. Allgemeine Hinweise" },
  { id: "erfassung",    label: "4. Datenerfassung auf dieser Website" },
  { id: "google",       label: "5. Google-Dienste" },
  { id: "meta",         label: "6. Meta (Facebook / Instagram)" },
  { id: "drittdienste", label: "7. Weitere Drittdienste" },
  { id: "rechte",       label: "8. Ihre Rechte" },
];

const UPDATED = "27.07.2026";

export default function Datenschutz() {
  const [activeSection, setActiveSection] = useState("ueberblick");

  useEffect(() => {
    window.scrollTo(0, 0);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-100">
      <PageSEO
        title="Datenschutzerklärung – Maitr"
        description="Datenschutzerklärung von Maitr: Informationen zur Datenverarbeitung, Google-Diensten, Meta-Pixel und Ihren Rechten."
        canonicalPath="/datenschutz"
        noindex={false}
      />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors"
            aria-label="Zurück zur Startseite"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Zurück zur Startseite</span>
          </a>
          <a
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent"
            aria-label="Maitr Startseite"
          >
            Maitr
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-24 flex flex-col md:flex-row gap-12">

        {/* Sidebar */}
        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-32">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-4 h-4 text-teal-500" />
              <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">
                Inhaltsverzeichnis
              </h3>
            </div>
            <div className="space-y-0.5 border-l-2 border-slate-200">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block px-4 py-2 text-sm transition-all duration-200 -ml-[2px] border-l-2 ${
                    activeSection === s.id
                      ? "border-teal-500 text-teal-700 font-semibold bg-teal-50/60"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </div>

            {/* Back-link sidebar */}
            <div className="mt-10 pt-6 border-t border-slate-200">
              <a
                href="/"
                className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Zur Startseite
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Datenschutzerklärung
            </h1>
            <p className="text-slate-500 text-sm">
              Stand: {UPDATED} · <a href="/" className="text-teal-600 hover:underline">maitr.de</a>
            </p>
          </div>

          <div className="space-y-16 text-slate-700 leading-relaxed prose prose-slate prose-a:text-teal-600 hover:prose-a:text-teal-700 max-w-none">

            {/* 1 */}
            <section id="ueberblick" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                1. Datenschutz auf einen Blick
              </h2>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Allgemeine Hinweise</h3>
              <p>
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
                personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
                Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
              </p>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 mt-6">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Wer ist verantwortlich?</h4>
                  <p className="text-sm">Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber (siehe Abschnitt 3).</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Welche Daten erheben wir?</h4>
                  <p className="text-sm">Technische Zugriffsdaten (IP, Browser), Registrierungsdaten (E-Mail, Name), Zahlungsdaten (über Stripe) sowie – nach Ihrer Einwilligung – Nutzungsdaten über Drittdienste wie Google und Meta.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Welche Rechte haben Sie?</h4>
                  <p className="text-sm">Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch – jederzeit. Details in Abschnitt 8.</p>
                </div>
              </div>
            </section>

            {/* 2 */}
            <section id="hosting" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                2. Hosting & Infrastruktur
              </h2>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Netlify</h3>
              <p>
                Wir hosten unsere Website bei Netlify, Inc., 512 2nd Street, Suite 200,
                San Francisco, CA 94107, USA. Beim Seitenaufruf erfasst Netlify Logfiles
                inkl. Ihrer IP-Adresse. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
                Datenübertragung in die USA: EU-Standardvertragsklauseln.
              </p>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Railway & Neon (Datenbankserver)</h3>
              <p>
                Unser Backend und unsere Datenbank laufen auf Railway (548 Market St PMB 68956,
                San Francisco, CA 94104) und Neon. Dort speichern wir Account-Informationen,
                Restaurantkonfigurationen und Reservierungsdaten.
              </p>
              <div className="mt-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl">
                <p className="text-teal-900 text-sm font-medium m-0">
                  Mit allen Anbietern wurden Verträge zur Auftragsverarbeitung (AVV) nach Art. 28 DSGVO abgeschlossen.
                </p>
              </div>
            </section>

            {/* 3 */}
            <section id="allgemein" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                3. Allgemeine Hinweise und Pflichtinformationen
              </h2>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Hinweis zur verantwortlichen Stelle</h3>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <p className="mb-1 text-slate-900 font-medium">Verantwortlich im Sinne der DSGVO:</p>
                <p className="mb-0">
                  Julian Heinrich<br />
                  Hansaring 37<br />
                  48155 Münster
                </p>
                <p className="mt-4 mb-0">
                  Telefon: 017632011307<br />
                  E-Mail: <a href="mailto:julian.heinrich@maitr.de">julian.heinrich@maitr.de</a>
                </p>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Speicherdauer</h3>
              <p>
                Personenbezogene Daten werden gelöscht, sobald der Zweck der Verarbeitung entfällt,
                es sei denn, gesetzliche Aufbewahrungsfristen (z. B. 6–10 Jahre für steuerrechtliche
                Unterlagen) stehen dem entgegen.
              </p>
            </section>

            {/* 4 */}
            <section id="erfassung" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                4. Datenerfassung auf dieser Website
              </h2>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Cookies</h3>
              <p>
                Wir verwenden Cookies. Technisch notwendige Cookies werden auf Grundlage von
                Art. 6 Abs. 1 lit. f DSGVO gesetzt. Alle anderen Cookies (Analyse, Marketing)
                werden nur nach Ihrer Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO aktiv.
                Einwilligung widerrufbar über „Cookie-Einstellungen" im Footer.
              </p>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Server-Log-Dateien</h3>
              <p>Beim Seitenaufruf erfasst unser Hoster automatisch:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Browsertyp und -version</li>
                <li>Betriebssystem</li>
                <li>Referrer-URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse (anonymisiert nach 7 Tagen)</li>
              </ul>
              <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Registrierung & Authentifizierung (Clerk)</h3>
              <p>
                Zur Nutzerverwaltung setzen wir <strong>Clerk</strong> (Clerk, Inc.,
                2261 Market Street, San Francisco, CA 94114, USA) ein. Bei der Registrierung
                werden E-Mail-Adresse, Name und ggf. Daten aus Social-Logins (Google, Apple)
                an Clerk übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
                AVV abgeschlossen; Standardvertragsklauseln für USA-Transfers.
              </p>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Zahlungsabwicklung (Stripe)</h3>
              <p>
                Abonnements werden über <strong>Stripe Payments Europe, Ltd.</strong>
                (1 Grand Canal Street Lower, Dublin, Irland) abgewickelt. Zahlungsdaten
                werden verschlüsselt direkt an Stripe übertragen – wir speichern keine
                Kreditkartennummern. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
              </p>
            </section>

            {/* 5 - GOOGLE */}
            <section id="google" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                5. Google-Dienste
              </h2>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl mb-8">
                <p className="text-blue-900 text-sm m-0">
                  <strong>Anbieter:</strong> Google Ireland Limited, Gordon House, Barrow Street,
                  Dublin 4, Irland (Muttergesellschaft: Google LLC, 1600 Amphitheatre Parkway,
                  Mountain View, CA 94043, USA). Google ist unter dem EU-US Data Privacy Framework zertifiziert.
                  <br />
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 mt-1"
                  >
                    Googles Datenschutzerklärung <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Google Fonts</h3>
              <p>
                Schriftarten von Google Fonts werden lokal eingebunden – es findet keine
                Verbindung zu Google-Servern beim Seitenaufruf statt und es werden keine
                personenbezogenen Daten an Google übertragen.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Google Sign-In (über Clerk)</h3>
              <p>
                Wenn Sie sich über „Mit Google anmelden" registrieren oder einloggen,
                wird eine Verbindung zu den OAuth-Servern von Google hergestellt.
                Google übermittelt dabei folgende <strong>personenbezogene Nutzerdaten</strong> an Clerk,
                die wir zur Kontoführung verwenden:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Google-Konto-ID (Nutzer-ID, sog. „sub")</li>
                <li>E-Mail-Adresse</li>
                <li>Vor- und Nachname</li>
                <li>Profilbild-URL (sofern vorhanden und freigegeben)</li>
                <li>E-Mail-Verifizierungsstatus</li>
              </ul>
              <p>
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                und Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktive Nutzung des
                Google-Login-Buttons).
              </p>
              <p>
                Google kann im Zuge des OAuth-Flows seinerseits Nutzungsdaten verarbeiten.
                Einzelheiten regelt Googles Datenschutzerklärung. Einwilligung widerrufbar in den{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Google-Kontoeinstellungen → Berechtigungen
                </a>{" "}
                sowie durch Löschung Ihres Maitr-Kontos.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Google Maps (auf Kunden-Websites)</h3>
              <p>
                Auf den durch Maitr erzeugten Restaurant-Websites unserer Kunden kann Google Maps
                eingebettet werden. Dabei wird eine Verbindung zu Googles Servern aufgebaut und
                die IP-Adresse des Besuchers übertragen – jedoch erst nach ausdrücklicher
                Einwilligung über das Cookie-Consent-Banner der jeweiligen Seite.
                Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO.
              </p>
            </section>

            {/* 6 - META */}
            <section id="meta" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                6. Meta (Facebook / Instagram)
              </h2>
              <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-xl mb-8">
                <p className="text-indigo-900 text-sm m-0">
                  <strong>Anbieter:</strong> Meta Platforms Ireland Limited, 4 Grand Canal Square,
                  Dublin 2, Irland (Muttergesellschaft: Meta Platforms, Inc., 1 Hacker Way,
                  Menlo Park, CA 94025, USA). Meta ist unter dem EU-US Data Privacy Framework zertifiziert.
                  <br />
                  <a
                    href="https://www.facebook.com/privacy/policy"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 mt-1"
                  >
                    Metas Datenschutzerklärung <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Instagram-Datenabruf (server-seitig)</h3>
              <p>
                Zur Anzeige von Instagram-Fotos auf den durch Maitr erzeugten Kunden-Websites
                ruft unser Server auf Wunsch des Kunden öffentlich zugängliche Profilseiten
                auf Instagram ab. Es werden dabei <strong>keine personenbezogenen Daten von
                Websitebesuchern an Meta übertragen</strong> – der Abruf erfolgt ausschließlich
                server-seitig durch unseren Server. Es werden lediglich öffentliche Bild-URLs
                aus dem HTML der Instagram-Profilseite extrahiert.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Meta-Pixel / Facebook Pixel</h3>
              <p>
                Auf <strong>maitr.de selbst setzen wir keinen Meta-Pixel ein.</strong> Auf den durch
                unsere Kunden erstellten Restaurant-Websites kann ein Meta-Pixel durch den
                jeweiligen Restaurant-Betreiber (Kunden von Maitr) konfiguriert werden. In diesem Fall:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  Verarbeitet Meta folgende <strong>Nutzerdaten</strong> der Websitebesucher:
                  IP-Adresse, Browser-Informationen, besuchte Seiten, Klickverhalten,
                  Cookie-IDs und Gerätekennungen.
                </li>
                <li>
                  Der Pixel wird auf Kunden-Websites erst nach ausdrücklicher Einwilligung
                  des Besuchers (Cookie-Consent) geladen.
                </li>
                <li>
                  Datenschutzverantwortlicher für diese Verarbeitung ist der jeweilige
                  Restaurant-Betreiber als Kunde von Maitr, <em>nicht Maitr selbst</em>.
                </li>
              </ul>
              <p>
                Widerspruch gegen Metas Werbedatenverarbeitung:{" "}
                <a
                  href="https://www.facebook.com/settings?tab=ads"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  facebook.com/settings → Werbeanzeigen
                </a>
                .
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Facebook / Instagram Social Plugins</h3>
              <p>
                Wir binden auf maitr.de keine Facebook- oder Instagram-Plugins ein.
                Verlinkungen zu unseren Social-Media-Präsenzen sind einfache Hyperlinks
                ohne Plugin-Tracking.
              </p>
            </section>

            {/* 7 */}
            <section id="drittdienste" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                7. Weitere Drittdienste
              </h2>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Resend (E-Mail-Versand)</h3>
              <p>
                Für Transaktions-E-Mails (Reservierungsbestätigungen, Benachrichtigungen)
                nutzen wir Resend (Resend, Inc., 2261 Market Street, San Francisco, CA 94114, USA).
                Dabei werden E-Mail-Adresse und Nachrichteninhalt übertragen. AVV abgeschlossen.
                Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
              </p>
              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">n8n (KI-Automatisierung)</h3>
              <p>
                Für KI-gestützte Inhaltsvorschläge leiten wir Anfragen an einen
                n8n-Workflow-Server weiter. Dabei werden die von Ihnen eingegebenen
                Geschäftsdaten (Name, Website-URL) übertragen. Eine Weitergabe an Dritte
                findet nicht statt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
              </p>
            </section>

            {/* 8 */}
            <section id="rechte" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                8. Ihre Rechte
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  { titel: "Auskunft (Art. 15 DSGVO)", text: "Sie können Auskunft über alle zu Ihrer Person gespeicherten Daten verlangen." },
                  { titel: "Berichtigung (Art. 16 DSGVO)", text: "Sie haben das Recht auf Korrektur unrichtiger personenbezogener Daten." },
                  { titel: "Löschung (Art. 17 DSGVO)", text: "Sie können die Löschung Ihrer Daten verlangen, sofern keine Aufbewahrungspflichten entgegenstehen." },
                  { titel: "Einschränkung (Art. 18 DSGVO)", text: "Sie können die Einschränkung der Verarbeitung Ihrer Daten verlangen." },
                  { titel: "Datenübertragbarkeit (Art. 20 DSGVO)", text: "Sie erhalten Ihre Daten in einem maschinenlesbaren Format." },
                  { titel: "Widerspruch (Art. 21 DSGVO)", text: "Sie können der Verarbeitung auf Basis berechtigter Interessen widersprechen." },
                  { titel: "Widerruf der Einwilligung", text: "Einwilligungen können Sie jederzeit ohne Angabe von Gründen widerrufen." },
                  { titel: "Beschwerderecht", text: "LDI NRW, Kavalleriestr. 2–4, 40213 Düsseldorf – ldi.nrw.de" },
                ].map((r) => (
                  <div key={r.titel} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{r.titel}</h4>
                    <p className="text-sm text-slate-600 m-0">{r.text}</p>
                  </div>
                ))}
              </div>
              <p>
                Zur Ausübung Ihrer Rechte:{" "}
                <a href="mailto:julian.heinrich@maitr.de">julian.heinrich@maitr.de</a>
              </p>
            </section>

          </div>

          {/* Page footer */}
          <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Startseite
            </a>
            <p className="m-0">
              Basierend auf{" "}
              <a
                href="https://www.e-recht24.de"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-800 transition-colors font-medium"
              >
                e-recht24.de
              </a>
              {" · "}Stand: {UPDATED}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
