import { PageSEO } from "@/components/seo/PageSEO";
import React, { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, Shield } from "lucide-react";
import { Link } from "react-router-dom";

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
        noindex={false}
      />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors"
            aria-label="Zurück zur Startseite"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Zurück zur Startseite</span>
          </Link>
          <Link
            to="/"
            className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent"
            aria-label="Maitr Startseite"
          >
            Maitr
          </Link>
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

            {/* Back-link (sidebar) */}
            <div className="mt-10 pt-6 border-t border-slate-200">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Zur Startseite
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Datenschutzerklärung
            </h1>
            <p className="text-slate-500 text-sm">Stand: {UPDATED} · <Link to="/" className="text-teal-600 hover:underline">maitr.de</Link></p>
          </div>

          <div className="space-y-16 text-slate-700 leading-relaxed prose prose-slate prose-a:text-teal-600 hover:prose-a:text-teal-700 max-w-none">

            {/* ─── 1. Überblick ─────────────────────────────── */}
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
                  <p className="text-sm">Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch jederzeit. Details in Abschnitt 8.</p>
                </div>
              </div>
            </section>

            {/* ─── 2. Hosting ───────────────────────────────── */}
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
                Unser Backend und die Datenbank laufen auf Railway (548 Market St PMB 68956,
                San Francisco, CA 94104) und Neon. Dort speichern wir Account-Informationen,
                Restaurantkonfigurationen und Reservierungsdaten.
              </p>

              <div className="mt-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl">
                <p className="text-teal-900 text-sm font-medium m-0">
                  Mit allen Anbietern wurden Verträge zur Auftragsverarbeitung (AVV) nach Art. 28 DSGVO abgeschlossen.
                </p>
              </div>
            </section>

            {/* ─── 3. Allgemeine Hinweise ───────────────────── */}
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
                es sei denn, gesetzliche Aufbewahrungsfristen (z. B. handels- oder steuerrechtliche
                Fristen von 6–10 Jahren) stehen dem entgegen.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Datenschutzbeauftragter</h3>
              <p>
                Da wir als kleines Unternehmen keine gesetzliche Pflicht zur Bestellung eines
                Datenschutzbeauftragten haben, wenden Sie sich bei Datenschutzfragen direkt an
                die oben genannte verantwortliche Stelle.
              </p>
            </section>

            {/* ─── 4. Datenerfassung ───────────────────────── */}
            <section id="erfassung" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                4. Datenerfassung auf dieser Website
              </h2>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Cookies</h3>
              <p>
                Wir verwenden Cookies – kleine Datenpakete, die auf Ihrem Gerät gespeichert werden.
                Technisch notwendige Cookies werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
                gesetzt. Alle anderen Cookies (Analyse, Marketing) werden nur nach Ihrer Einwilligung
                gemäß Art. 6 Abs. 1 lit. a DSGVO aktiv. Sie können Ihre Einwilligung jederzeit über
                den Link „Cookie-Einstellungen" im Footer widerrufen.
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
              <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Betriebssicherheit).</p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Registrierung & Authentifizierung (Clerk)</h3>
              <p>
                Zur Nutzerverwaltung setzen wir <strong>Clerk</strong> (Clerk, Inc., 2261 Market Street,
                San Francisco, CA 94114, USA) ein. Bei der Registrierung werden E-Mail-Adresse, Name
                und ggf. Daten aus Social-Logins (Google, Apple) an Clerk übermittelt und dort verarbeitet.
                Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
                AVV mit Clerk abgeschlossen; Standardvertragsklauseln für USA-Transfers.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Zahlungsabwicklung (Stripe)</h3>
              <p>
                Kostenpflichtige Abonnements werden über <strong>Stripe Payments Europe, Ltd.</strong>
                (1 Grand Canal Street Lower, Dublin, Irland) abgewickelt. Zahlungsdaten werden
                direkt und verschlüsselt an Stripe übertragen – wir speichern keine Kreditkartennummern.
                Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
              </p>
            </section>

            {/* ─── 5. Google-Dienste ───────────────────────── */}
            <section id="google" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                5. Google-Dienste
              </h2>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl mb-8">
                <p className="text-blue-900 text-sm m-0">
                  <strong>Anbieter:</strong> Google Ireland Limited, Gordon House, Barrow Street,
                  Dublin 4, Irland (Muttergesellschaft: Google LLC, 1600 Amphitheatre Parkway,
                  Mountain View, CA 94043, USA).<br />
                  Google ist unter dem EU-US Data Privacy Framework zertifiziert.
                  Datenschutzerklärung:{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1"
                  >
                    policies.google.com/privacy <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Google Fonts</h3>
              <p>
                Wir binden Schriftarten von Google Fonts lokal ein – es findet keine Verbindung
                zu Google-Servern beim Seitenaufruf statt und keine Daten werden übertragen.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Google Sign-In (über Clerk)</h3>
              <p>
                Wenn Sie sich über den „Mit Google anmelden"-Button registrieren oder einloggen,
                wird eine Verbindung zu den OAuth-Servern von Google hergestellt. Google übermittelt
                dabei folgende <strong>personenbezogene Nutzerdaten</strong> an uns:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Google-Konto-ID (sub)</li>
                <li>E-Mail-Adresse</li>
                <li>Vor- und Nachname</li>
                <li>Profilbild-URL (sofern vorhanden)</li>
                <li>E-Mail-Verifizierungsstatus</li>
              </ul>
              <p>
                Diese Daten werden bei Clerk gespeichert und von uns zur Bereitstellung des
                Nutzerkontos verarbeitet. <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
                (Vertragserfüllung) bzw. Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktive Nutzung
                des Social-Login-Buttons).
              </p>
              <p>
                Google kann im Zuge des OAuth-Flows seinerseits Nutzungsdaten verarbeiten.
                Einzelheiten regelt Googles eigene Datenschutzerklärung. Sie können Ihre
                Einwilligung jederzeit widerrufen, indem Sie den Google-Zugriff in Ihren
                Google-Kontoeinstellungen (
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  myaccount.google.com/permissions
                </a>
                ) entfernen und Ihr Maitr-Konto löschen.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Google Maps (eingebettet durch Kunden-Websites)</h3>
              <p>
                Auf den durch Maitr erzeugten Restaurant-Websites unserer Kunden kann Google Maps
                eingebettet werden. Dabei wird eine Verbindung zu Googles Servern aufgebaut und
                die IP-Adresse des Besuchers übertragen. Dies erfolgt erst nach ausdrücklicher
                Einwilligung des Besuchers über das Cookie-Banner auf der jeweiligen Seite.
                Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO.
              </p>
            </section>

            {/* ─── 6. Meta ─────────────────────────────────── */}
            <section id="meta" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                6. Meta (Facebook / Instagram)
              </h2>

              <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-xl mb-8">
                <p className="text-indigo-900 text-sm m-0">
                  <strong>Anbieter:</strong> Meta Platforms Ireland Limited, 4 Grand Canal Square,
                  Dublin 2, Irland (Muttergesellschaft: Meta Platforms, Inc., 1 Hacker Way,
                  Menlo Park, CA 94025, USA).<br />
                  Meta ist unter dem EU-US Data Privacy Framework zertifiziert.
                  Datenschutzerklärung:{" "}
                  <a
                    href="https://www.facebook.com/privacy/policy"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1"
                  >
                    facebook.com/privacy/policy <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Instagram-Datenabruf (Server-seitig)</h3>
              <p>
                Zur Anzeige von Instagram-Fotos auf den durch Maitr erzeugten Kunden-Websites
                ruft unser Server auf Wunsch des Kunden öffentlich zugängliche Profilseiten
                auf Instagram ab. Dabei werden keine personenbezogenen Daten von Websitebesuchern
                an Meta übertragen – der Abruf erfolgt ausschließlich server-seitig.
              </p>
              <p>
                Es werden lediglich öffentliche Bild-URLs aus dem HTML der Instagram-Profilseite
                extrahiert. Eine Nutzung des offiziellen Instagram-Graph-API findet derzeit
                nicht statt.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Meta-Pixel / Facebook Pixel</h3>
              <p>
                Wir setzen auf <strong>maitr.de selbst keinen Meta-Pixel</strong> ein. Auf den durch
                unsere Kunden erstellten Restaurant-Websites kann ein Meta-Pixel durch den Kunden
                konfiguriert und eingebunden werden. In diesem Fall:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  Verarbeitet Meta folgende <strong>Nutzerdaten</strong>: IP-Adresse, Browser-Informationen,
                  besuchte Seiten, Klicks, Cookie-IDs, Gerätekennungen.
                </li>
                <li>
                  Der Pixel wird erst nach ausdrücklicher Einwilligung des Besuchers geladen
                  (Cookie-Consent-Pflicht).
                </li>
                <li>
                  Verantwortlicher für diese Datenverarbeitung ist der jeweilige Restaurant-Betreiber
                  (Kunde von Maitr), nicht Maitr selbst.
                </li>
              </ul>
              <p>
                <strong>Rechtsgrundlage</strong> (soweit Maitr betroffen): Art. 6 Abs. 1 lit. a DSGVO
                (Einwilligung). Widerspruch möglich über:{" "}
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
                Wir binden keine direkten Facebook- oder Instagram-Buttons auf maitr.de ein.
                Verlinkungen zu unseren Social-Media-Präsenzen sind einfache Hyperlinks ohne
                Plugin-Tracking.
              </p>
            </section>

            {/* ─── 7. Weitere Drittdienste ─────────────────── */}
            <section id="drittdienste" className="scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                7. Weitere Drittdienste
              </h2>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Resend (E-Mail-Versand)</h3>
              <p>
                Für den Versand von Transaktions-E-Mails (Reservierungsbestätigungen, Benachrichtigungen)
                nutzen wir Resend (Resend, Inc., 2261 Market Street, San Francisco, CA 94114, USA).
                Dabei werden E-Mail-Adresse und Inhalt der Nachricht übertragen.
                AVV abgeschlossen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
              </p>

              <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">n8n (Automatisierungs-Workflows)</h3>
              <p>
                Für bestimmte Automatisierungsaufgaben (z. B. KI-gestützte Inhaltsvorschläge)
                leiten wir Anfragen an einen n8n-Workflow-Server weiter. Dabei werden die von Ihnen
                eingegebenen Geschäftsdaten (Name, URL, Google-Maps-Link) übertragen.
                Es findet keine Weitergabe an Dritte statt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
              </p>
            </section>

            {/* ─── 8. Ihre Rechte ──────────────────────────── */}
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
                  { titel: "Beschwerderecht", text: "Sie können sich bei der zuständigen Aufsichtsbehörde beschweren (LDI NRW, Kavalleriestr. 2–4, 40213 Düsseldorf)." },
                ].map((r) => (
                  <div key={r.titel} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{r.titel}</h4>
                    <p className="text-sm text-slate-600 m-0">{r.text}</p>
                  </div>
                ))}
              </div>

              <p>
                Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
                <a href="mailto:julian.heinrich@maitr.de">julian.heinrich@maitr.de</a>
              </p>
            </section>

          </div>

          {/* Footer der Seite */}
          <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Startseite
            </Link>
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
