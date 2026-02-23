import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const sections = [
    { id: "ueberblick", label: "1. Datenschutz auf einen Blick" },
    { id: "hosting", label: "2. Hosting" },
    { id: "allgemein", label: "3. Allgemeine Hinweise" },
    { id: "erfassung", label: "4. Datenerfassung auf dieser Website" },
    { id: "analyse", label: "5. Analyse-Tools und Werbung" },
];

export default function Datenschutz() {
    const [activeSection, setActiveSection] = useState("ueberblick");

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
                        <div className="space-y-1 border-l-2 border-slate-200">
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
                    <div className="mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                            Datenschutzerklärung
                        </h1>
                        <p className="text-slate-500">Stand: {new Date().toLocaleDateString("de-DE")}</p>
                    </div>

                    <div className="space-y-16 text-slate-700 leading-relaxed prose prose-slate prose-a:text-teal-600 hover:prose-a:text-teal-700 max-w-none">

                        {/* 1. Überblick */}
                        <section id="ueberblick" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                1. Datenschutz auf einen Blick
                            </h2>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Allgemeine Hinweise</h3>
                            <p>
                                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
                                personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
                                Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche
                                Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten
                                Datenschutzerklärung.
                            </p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Datenerfassung auf dieser Website</h3>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h4>
                                    <p className="text-sm">Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Wie erfassen wir Ihre Daten?</h4>
                                    <p className="text-sm">Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben oder die im Rahmen der Registrierung übermittelt werden. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Wofür nutzen wir Ihre Daten?</h4>
                                    <p className="text-sm">Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens und zur technischen Bereitstellung unserer SaaS-Dienste verwendet werden.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Welche Rechte haben Sie bezüglich Ihrer Daten?</h4>
                                    <p className="text-sm">Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht auf Berichtigung oder Löschung dieser Daten. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit widerrufen.</p>
                                </div>
                            </div>
                        </section>

                        {/* 2. Hosting */}
                        <section id="hosting" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                2. Hosting
                            </h2>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Netlify</h3>
                            <p>
                                Wir hosten unsere Website bei Netlify. Anbieter ist die Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, USA (nachfolgend Netlify).
                                Wenn Sie unsere Website besuchen, erfasst Netlify verschiedene Logfiles inklusive Ihrer IP-Adresse.
                            </p>
                            <p>
                                Die Verwendung von Netlify erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung unserer Website.
                                Die Datenübertragung in die USA wird auf die Standardvertragsklauseln der EU-Kommission gestützt.
                            </p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Railway und Supabase / Neon</h3>
                            <p>
                                Teile unseres Backends und unserer Datenbanken werden über Railway (Railway Corporation, 548 Market St PMB 68956, San Francisco, CA 94104) und Neon betrieben.
                                Diese Dienste dienen der Speicherung von Account-Informationen und App-Konfigurationen.
                                Darauf speichern wir z. B. Ihre Nutzerdaten und Restaurantspezifische Informationen, die Sie uns während der Registrierung mitgeteilt haben.
                            </p>

                            <div className="mt-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl">
                                <p className="text-teal-900 text-sm font-medium m-0">Wir haben mit allen Anbietern entsprechende Verträge über Auftragsverarbeitung (AVV) geschlossen, um sicherzustellen, dass diese die Daten unserer Websitebesucher nur nach unseren Weisungen und unter Einhaltung der DSGVO verarbeiten.</p>
                            </div>
                        </section>

                        {/* 3. Allgemeine Hinweise */}
                        <section id="allgemein" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                3. Allgemeine Hinweise und Pflichtinformationen
                            </h2>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Datenschutz</h3>
                            <p>Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Hinweis zur verantwortlichen Stelle</h3>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                                <p className="mb-1 text-slate-900 font-medium">Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
                                <p className="mb-0">Julian Heinrich<br />Hansaring 37<br />48155 Münster</p>
                                <p className="mt-4 mb-0">Telefon: 017632011307<br />E-Mail: julian.heinrich@maitr.de</p>
                            </div>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Speicherdauer</h3>
                            <p>Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer personenbezogenen Daten haben.</p>
                        </section>

                        {/* 4. Datenerfassung */}
                        <section id="erfassung" className="scroll-mt-32">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                4. Datenerfassung auf dieser Website
                            </h2>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Cookies</h3>
                            <p>Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.</p>
                            <p>Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs, zur Bereitstellung bestimmter, von Ihnen erwünschter Funktionen (z. B. für die Warenkorbfunktion) oder zur Optimierung der Website (z. B. Cookies zur Messung des Webpublikums) erforderlich sind (notwendige Cookies), werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert, sofern keine andere Rechtsgrundlage angegeben wird.</p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Server-Log-Dateien</h3>
                            <p>Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:</p>
                            <ul className="list-disc pl-6 space-y-2 mb-6">
                                <li>Browsertyp und Browserversion</li>
                                <li>verwendetes Betriebssystem</li>
                                <li>Referrer URL</li>
                                <li>Hostname des zugreifenden Rechners</li>
                                <li>Uhrzeit der Serveranfrage</li>
                                <li>IP-Adresse</li>
                            </ul>
                            <p>Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Registrierung auf dieser Website (Clerk)</h3>
                            <p>Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen (das Dashboard) auf der Seite zu nutzen. Die dazu eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des jeweiligen Angebotes oder Dienstes.</p>
                            <p>Für die Authentifizierung und Nutzerverwaltung verwenden wir "Clerk", bereitgestellt von Clerk, Inc. Dabei werden Ihre Login-Informationen (z. B. E-Mail, Passwort, ggf. Social Logins) an Server von Clerk (ggf. in den USA) übertragen und dort verarbeitet. Wir haben mit Clerk einen Vertrag zur Auftragsverarbeitung abgeschlossen.</p>

                            <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Zahlungsdienstleister (Stripe)</h3>
                            <p>Zur Abwicklung von Zahlungen (Abonnements) binden wir Stripe ein (Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland). Wenn Sie einen kostenpflichtigen Dienst bei uns buchen, werden die von Ihnen eingegebenen Zahlungsdaten (z.B. Kreditkartendaten) direkt an Stripe übermittelt.</p>
                            <p>Die Übermittlung Ihrer Daten an Stripe erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragsabwicklung).</p>
                        </section>

                    </div>

                    <div className="mt-20 pt-8 border-t border-slate-200 text-sm text-slate-500 text-center">
                        <p>
                            Quelle:{" "}
                            <a href="https://www.e-recht24.de" target="_blank" rel="noreferrer" className="hover:text-slate-800 transition-colors font-medium">
                                e-recht24.de
                            </a>
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
