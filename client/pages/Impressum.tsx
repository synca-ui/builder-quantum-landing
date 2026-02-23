import React, { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

export default function Impressum() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-100">
            {/* Navbar Minimal */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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

            <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                        Impressum
                    </h1>
                    <p className="text-slate-500">Stand: {new Date().toLocaleDateString("de-DE")}</p>
                </div>

                <div className="space-y-12 text-slate-700 leading-relaxed">
                    {/* Angaben gemäß § 5 TMG */}
                    <section>
                        <h2 className="text-sm font-bold tracking-widest uppercase text-teal-600 mb-4">
                            Angaben gemäß § 5 TMG
                        </h2>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="mb-1">Julian Heinrich</p>
                            <p className="mb-1">Hansaring 37</p>
                            <p>48155 Münster</p>
                        </div>
                    </section>

                    {/* Kontakt */}
                    <section>
                        <h2 className="text-sm font-bold tracking-widest uppercase text-teal-600 mb-4">
                            Kontakt
                        </h2>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-2">
                            <p className="flex items-center gap-3">
                                <span className="font-semibold w-16">Telefon:</span>
                                <a href="tel:+4917632011307" className="text-teal-600 hover:underline">017632011307</a>
                            </p>
                            <p className="flex items-center gap-3">
                                <span className="font-semibold w-16">E-Mail:</span>
                                <a href="mailto:julian.heinrich@maitr.de" className="text-teal-600 hover:underline">julian.heinrich@maitr.de</a>
                            </p>
                        </div>
                    </section>

                    {/* EU-Streitschlichtung */}
                    <section>
                        <h2 className="text-sm font-bold tracking-widest uppercase text-teal-600 mb-4">
                            EU-Streitschlichtung
                        </h2>
                        <div className="prose prose-slate">
                            <p>
                                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
                                <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer" className="text-teal-600 hover:underline font-medium">
                                    https://ec.europa.eu/consumers/odr/
                                </a>.<br />
                                Unsere E-Mail-Adresse finden Sie oben im Impressum.
                            </p>
                        </div>
                    </section>

                    {/* Verbraucherstreitbeilegung */}
                    <section>
                        <h2 className="text-sm font-bold tracking-widest uppercase text-teal-600 mb-4">
                            Verbraucherstreitbeilegung/Universalschlichtungsstelle
                        </h2>
                        <div className="prose prose-slate">
                            <p>
                                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                            </p>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="mt-20 pt-8 border-t border-slate-200 text-sm text-slate-500 text-center">
                    <p>
                        Quelle:{" "}
                        <a href="https://www.e-recht24.de/impressum-generator.html" target="_blank" rel="noreferrer" className="hover:text-slate-800 transition-colors">
                            e-recht24.de
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
}
