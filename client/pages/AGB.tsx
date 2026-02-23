import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const sections = [
    { id: "geltungsbereich", label: "§ 1 Geltungsbereich" },
    { id: "vertragsgegenstand", label: "§ 2 Vertragsgegenstand" },
    { id: "vertragsschluss", label: "§ 3 Vertragsschluss" },
    { id: "leistungen", label: "§ 4 Leistungen" },
    { id: "nutzungsrechte", label: "§ 5 Nutzungsrechte" },
    { id: "preise", label: "§ 6 Preise & Zahlung" },
    { id: "laufzeit", label: "§ 7 Laufzeit & Kündigung" },
    { id: "widerruf", label: "§ 8 Widerruf" },
    { id: "pflichten", label: "§ 9 Pflichten des Nutzers" },
    { id: "haftung", label: "§ 10 Haftung" },
    { id: "datenschutz", label: "§ 11 Datenschutz" },
    { id: "schluss", label: "§ 12 Schlussbestimmungen" },
];

export default function AGB() {
    const [activeSection, setActiveSection] = useState("geltungsbereich");

    useEffect(() => {
        window.scrollTo(0, 0);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
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
            {/* Navbar Minimal */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <a
                        href="/"
                        className="flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Zurück zur Startseite</span>
                    </a>
                    <a href="/" className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                        Maitr
                    </a>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 pt-32 pb-24 flex flex-col md:flex-row gap-12">
                {/* Sidebar */}
                <aside className="hidden md:block w-64 shrink-0">
                    <div className="sticky top-32">
                        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-6">
                            Inhaltsverzeichnis
                        </h3>
                        <div className="space-y-1 border-l-2 border-slate-200 h-[calc(100vh-16rem)] overflow-y-auto pr-4 custom-scrollbar">
                            {sections.map((s) => (
                                <a
                                    key={s.id}
                                    href={`#${s.id}`}
                                    className={`block px-4 py-2 text-sm transition-all duration-200 -ml-[2px] border-l-2 ${activeSection === s.id
                                        ? "border-teal-500 text-teal-700 font-semibold bg-teal-50/50"
                                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                                        }`}
                                >
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                            Allgemeine Geschäftsbedingungen
                        </h1>
                        <p className="text-slate-500">
                            Stand: {new Date().toLocaleDateString("de-DE")} · maitr.de
                        </p>
                    </div>

                    <div className="space-y-16 text-slate-700 leading-relaxed max-w-none prose prose-slate prose-a:text-teal-600 hover:prose-a:text-teal-700">
                        {/* § 1 */}
                        <section id="geltungsbereich" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 1 Geltungsbereich
                            </h2>
                            <p>
                                Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen Julian Heinrich, Hansaring 37, 48155 Münster (nachfolgend „Anbieter") und Unternehmern sowie Verbrauchern (nachfolgend „Nutzer") über die Nutzung der SaaS-Plattform maitr.de.
                            </p>
                            <p>
                                Abweichende, entgegenstehende oder ergänzende AGB des Nutzers werden nicht Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.
                            </p>
                            <div className="mt-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl">
                                <p className="text-teal-900 text-sm font-medium m-0">Diese AGB gelten ausschließlich für die Nutzung von maitr.de. Für die Subdomain check.maitr.de gelten gesonderte Bedingungen.</p>
                            </div>
                        </section>

                        {/* § 2 */}
                        <section id="vertragsgegenstand" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 2 Vertragsgegenstand
                            </h2>
                            <p>
                                Gegenstand des Vertrages ist die Bereitstellung einer cloudbasierten Software-as-a-Service (SaaS)-Plattform zur Erstellung und Verwaltung digitaler Web-Apps für Gastronomiebetriebe (Restaurants, Cafés, Bars und ähnliche Einrichtungen).
                            </p>
                            <p>
                                Der Anbieter stellt dem Nutzer über das Internet eine Webanwendung zur Verfügung, mit der der Nutzer eigenständig Web-Apps für sein Unternehmen konfigurieren, veröffentlichen und verwalten kann. Der konkrete Leistungsumfang ergibt sich aus der jeweils aktuellen Leistungsbeschreibung auf maitr.de.
                            </p>
                            <p>
                                Ein Anspruch auf bestimmte zukünftige Funktionen oder Features besteht nicht. Der Anbieter ist berechtigt, den Funktionsumfang der Plattform weiterzuentwickeln, zu ändern oder einzelne Features zu entfernen, sofern dadurch die Kernfunktionalität nicht wesentlich beeinträchtigt wird.
                            </p>
                        </section>

                        {/* § 3 */}
                        <section id="vertragsschluss" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 3 Vertragsschluss
                            </h2>
                            <p>
                                Der Vertrag kommt durch Registrierung auf maitr.de und Auswahl eines kostenpflichtigen Abonnements zustande. Mit Abschluss des Bestellvorgangs und Bestätigung der Zahlung gibt der Nutzer ein verbindliches Angebot zum Abschluss eines Abonnementvertrages ab.
                            </p>
                            <p>
                                Der Anbieter nimmt das Angebot an, indem er dem Nutzer unmittelbar nach Zahlungseingang den Zugang zur Plattform freischaltet. Eine separate Auftragsbestätigung per E-Mail kann zusätzlich versendet werden.
                            </p>
                            <p>
                                Der Vertragstext wird vom Anbieter nicht gespeichert. Der Nutzer kann die AGB jederzeit unter maitr.de/agb abrufen.
                            </p>
                        </section>

                        {/* § 4 */}
                        <section id="leistungen" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 4 Leistungen des Anbieters
                            </h2>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Verfügbarkeit</h3>
                            <p>Der Anbieter stellt die Plattform mit einer angestrebten Verfügbarkeit von 99 % im Jahresdurchschnitt zur Verfügung. Ausgenommen sind geplante Wartungsarbeiten sowie Ausfälle, die auf höhere Gewalt, Handlungen Dritter oder Infrastruktur von Drittanbietern (insbesondere Netlify, Railway, Neon) zurückzuführen sind.</p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Support</h3>
                            <p>Der Anbieter stellt Support per E-Mail unter julian.heinrich@maitr.de zur Verfügung. Ein Anspruch auf Reaktionszeiten besteht im Rahmen des Basisabonnements nicht.</p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Datensicherung</h3>
                            <p>Der Anbieter erstellt regelmäßige Backups der Nutzerdaten. Ein vertraglicher Anspruch auf Datensicherung oder -wiederherstellung besteht nicht. Dem Nutzer wird empfohlen, eigene Sicherungskopien seiner Daten vorzuhalten.</p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Updates</h3>
                            <p>Der Anbieter ist berechtigt, die Plattform jederzeit zu aktualisieren, zu verbessern und neue Funktionen hinzuzufügen. Wesentliche Änderungen werden dem Nutzer mit angemessener Vorlaufzeit angekündigt.</p>
                        </section>

                        {/* § 5 */}
                        <section id="nutzungsrechte" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 5 Nutzungsrechte
                            </h2>
                            <p>
                                Der Anbieter räumt dem Nutzer für die Dauer des Abonnements ein einfaches, nicht übertragbares, nicht unterlizenzierbares Recht zur Nutzung der Plattform im Rahmen dieser AGB ein.
                            </p>
                            <p>
                                Die mit der Plattform erstellten Web-Apps des Nutzers gehören dem Nutzer. Die Inhalte (Texte, Bilder, Logos), die der Nutzer in die Plattform einpflegt, verbleiben im Eigentum des Nutzers. Der Nutzer räumt dem Anbieter ein einfaches Nutzungsrecht an diesen Inhalten ein, soweit dies für den Betrieb der Plattform erforderlich ist.
                            </p>
                            <p>
                                Eine Reverse-Engineering, Dekompilierung oder anderweitige technische Analyse der Plattform ist nicht gestattet.
                            </p>
                        </section>

                        {/* § 6 */}
                        <section id="preise" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 6 Preise und Zahlung
                            </h2>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Preise</h4>
                                    <p className="text-sm">Die aktuellen Preise für die angebotenen Abonnements sind auf maitr.de ausgewiesen. Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Zahlungsabwicklung</h4>
                                    <p className="text-sm">Die Zahlungsabwicklung erfolgt über den Zahlungsdienstleister Stripe, Inc. Akzeptierte Zahlungsmittel sind Kreditkarte, SEPA-Lastschrift sowie weitere von Stripe angebotene Zahlungsmethoden. Die Zahlung wird mit Abschluss des Bestellvorgangs fällig.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Monatliches / Jährliches Abonnement</h4>
                                    <p className="text-sm">Beim monatlichen Abonnement wird der Betrag jeweils zu Beginn des Abrechnungszeitraums automatisch eingezogen. Beim jährlichen Abonnement wird der Jahresbetrag einmalig zu Beginn des Abrechnungszeitraums eingezogen.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Preisänderungen</h4>
                                    <p className="text-sm">Der Anbieter behält sich das Recht vor, die Preise mit einer Ankündigungsfrist von 30 Tagen zu ändern. Im Falle einer Preiserhöhung hat der Nutzer das Recht, den Vertrag zum Zeitpunkt des Wirksamwerdens der Preisänderung zu kündigen.</p>
                                </div>
                            </div>

                            <p className="text-sm mt-4 text-slate-500 italic">
                                Hinweis: Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zur Plattform bis zum Ausgleich der ausstehenden Beträge zu sperren.
                            </p>
                        </section>

                        {/* § 7 */}
                        <section id="laufzeit" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 7 Laufzeit und Kündigung
                            </h2>
                            <p>
                                <strong>Monatliches Abonnement:</strong> Läuft auf unbestimmte Zeit und verlängert sich automatisch um jeweils einen Monat. Die Kündigungsfrist beträgt 14 Tage zum Ende des jeweiligen Abrechnungszeitraums.
                            </p>
                            <p>
                                <strong>Jährliches Abonnement:</strong> Läuft für 12 Monate und verlängert sich automatisch um ein weiteres Jahr, sofern es nicht mit einer Frist von 30 Tagen zum Ende der Laufzeit gekündigt wird.
                            </p>
                            <p>
                                <strong>Kündigung:</strong> Kann jederzeit über das Dashboard des Nutzerkontos oder per E-Mail an julian.heinrich@maitr.de erfolgen.
                            </p>
                            <p>
                                <strong>Folgen der Kündigung:</strong> Nach Ablauf des bezahlten Zeitraums wird der Zugang zur Plattform deaktiviert. Die erstellten Web-Apps des Nutzers sind dann nicht mehr öffentlich zugänglich. Der Nutzer hat bis zur Deaktivierung die Möglichkeit, seine Daten (App-Konfigurationen, Inhalte) über das Dashboard zu exportieren. Nach Ablauf einer Aufbewahrungsfrist von 30 Tagen nach Kündigung werden alle Nutzerdaten unwiderruflich gelöscht.
                            </p>
                        </section>

                        {/* § 8 */}
                        <section id="widerruf" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 8 Widerrufsrecht
                            </h2>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Für Verbraucher</h3>
                            <p>Verbrauchern steht grundsätzlich ein 14-tägiges Widerrufsrecht zu. Da der Zugang zur Plattform unmittelbar nach Zahlung freigeschaltet wird, erlischt das Widerrufsrecht bei vollständiger Vertragserfüllung, wenn der Nutzer vor Beginn der Ausführung ausdrücklich zugestimmt hat, dass der Anbieter mit der Ausführung beginnt, und seine Kenntnis davon bestätigt hat, dass er sein Widerrufsrecht mit vollständiger Vertragserfüllung verliert.</p>

                            <div className="mt-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl">
                                <p className="text-teal-900 text-sm font-medium m-0">Im Bestellprozess wird der Nutzer aufgefordert, folgende Erklärung aktiv zu bestätigen: „Ich stimme zu, dass der Zugang sofort nach Zahlung freigeschaltet wird, und nehme zur Kenntnis, dass ich damit mein Widerrufsrecht verliere."</p>
                            </div>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Für Unternehmer</h3>
                            <p>Gewerblichen Nutzern steht kein gesetzliches Widerrufsrecht zu.</p>
                        </section>

                        {/* § 9 */}
                        <section id="pflichten" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 9 Pflichten des Nutzers
                            </h2>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Der Nutzer ist verpflichtet, seine Zugangsdaten geheim zu halten und unbefugten Dritten keinen Zugang zu gewähren. Bei Verdacht auf Missbrauch ist der Anbieter unverzüglich zu informieren.</li>
                                <li>Der Nutzer ist verantwortlich für alle über seinen Account vorgenommenen Handlungen und dafür, dass die von ihm eingestellten Inhalte keine Rechte Dritter verletzen und den gesetzlichen Anforderungen entsprechen.</li>
                                <li>Insbesondere ist es dem Nutzer untersagt, rechtswidrige, beleidigende, diskriminierende oder anderweitig anstößige Inhalte über die Plattform bereitzustellen sowie die Plattform für automatisierte Massenzugriffe, Spam oder andere missbräuchliche Nutzung zu verwenden.</li>
                                <li>Der Nutzer stellt den Anbieter von allen Ansprüchen Dritter frei, die aufgrund einer schuldhaften Verletzung dieser Pflichten entstehen.</li>
                            </ul>
                        </section>

                        {/* § 10 */}
                        <section id="haftung" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 10 Haftungsbeschränkung
                            </h2>
                            <p>Der Anbieter haftet uneingeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen.</p>
                            <p>Für leicht fahrlässig verursachte Schäden haftet der Anbieter nur, soweit eine wesentliche Vertragspflicht (Kardinalpflicht) verletzt wurde. In diesem Fall ist die Haftung auf den vorhersehbaren, typischerweise eintretenden Schaden begrenzt.</p>
                            <p>Der Anbieter haftet nicht für den Verlust von Daten, soweit dieser dadurch eingetreten ist, dass der Nutzer es unterlassen hat, angemessene Datensicherungsmaßnahmen durchzuführen. Der Anbieter haftet nicht für mittelbare Schäden, Folgeschäden oder entgangenen Gewinn.</p>
                            <p>Da maitr.de sich in einem frühen Entwicklungsstadium befindet, übernimmt der Anbieter keine Garantie für die dauerhafte Verfügbarkeit oder den störungsfreien Betrieb der Plattform.</p>
                        </section>

                        {/* § 11 */}
                        <section id="datenschutz" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 11 Datenschutz
                            </h2>
                            <p>Der Anbieter verarbeitet personenbezogene Daten des Nutzers ausschließlich zur Vertragserfüllung und im Einklang mit der Datenschutzgrundverordnung (DSGVO). Weitere Informationen zur Datenverarbeitung entnehmen Sie bitte der Datenschutzerklärung unter <a href="/datenschutz">maitr.de/datenschutz</a>.</p>
                            <p>Der Nutzer willigt ein, dass der Anbieter ihn per E-Mail über wichtige Änderungen am Dienst (z. B. Preisänderungen, Wartungsarbeiten, neue Funktionen) informieren darf. Werbliche Kommunikation erfolgt nur nach gesonderter Einwilligung.</p>
                        </section>

                        {/* § 12 */}
                        <section id="schluss" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                § 12 Schlussbestimmungen
                            </h2>
                            <ul className="list-disc pl-6 space-y-3">
                                <li>
                                    <strong>Anwendbares Recht:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG). Für Verbraucher gilt diese Rechtswahl nur, soweit der durch zwingende Bestimmungen des Rechts des Staates, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, gewährte Schutz nicht entzogen wird.
                                </li>
                                <li>
                                    <strong>Gerichtsstand:</strong> Gerichtsstand für alle Streitigkeiten mit Unternehmern ist Münster. Bei Verbrauchern gilt der gesetzliche Gerichtsstand.
                                </li>
                                <li>
                                    <strong>Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Anstelle der unwirksamen Bestimmung gilt die gesetzliche Regelung.
                                </li>
                                <li>
                                    <strong>Änderungen der AGB:</strong> Der Anbieter behält sich vor, diese AGB mit einer Ankündigungsfrist von 30 Tagen zu ändern. Änderungen werden dem Nutzer per E-Mail mitgeteilt. Widerspricht der Nutzer den geänderten AGB nicht innerhalb von 30 Tagen nach Bekanntgabe, gelten die geänderten AGB als akzeptiert. Auf dieses Widerspruchsrecht und die Bedeutung der Frist wird der Nutzer in der Änderungsmitteilung ausdrücklich hingewiesen.
                                </li>
                                <li>
                                    <strong>Streitbeilegung:</strong> Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr</a>. Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                                </li>
                            </ul>
                        </section>

                    </div>

                    <div className="mt-20 pt-8 border-t border-slate-200 text-sm text-slate-500">
                        <p>
                            Stand: {new Date().toLocaleDateString("de-DE")} · Julian Heinrich · Hansaring 37, 48155 Münster
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
