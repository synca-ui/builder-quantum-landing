const LINKEDIN = "https://www.linkedin.com/in/julian-heinrich-1b1a55232/";
const MAITR = "https://maitr.de";

export default function JulianPortfolio() {
  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,600&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .pf { font-family: 'Poppins', sans-serif; min-height: 100vh; overflow-x: hidden; }

        /* ── Nav ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 48px;
        }
        .nav-name {
          font-family: 'Poppins', sans-serif;
          font-weight: 600; font-size: 15px;
          color: rgba(20,12,5,0.7); letter-spacing: -0.02em;
        }
        .nav-links { display: flex; gap: 32px; }
        .nav-links a {
          font-family: 'Poppins', sans-serif;
          font-size: 11px; font-weight: 500;
          color: rgba(20,12,5,0.5); text-decoration: none;
          letter-spacing: 0.1em; text-transform: uppercase; transition: color 0.2s;
        }
        .nav-links a:hover { color: rgba(20,12,5,0.9); }

        /* ── Side icons ── */
        .side-icons {
          position: fixed;
          right: 28px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 200;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .side-icons .icon-btn {
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.3);
          backdrop-filter: blur(12px);
          color: rgba(255,255,255,0.85);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .side-icons .icon-btn:hover {
          background: rgba(255,255,255,0.35);
          color: #fff;
        }

        /* ── HERO ── */
        .hero {
          background: linear-gradient(160deg,
            #d4a882 0%, #c08860 20%,
            #a86840 40%, #8c4e2e 60%,
            #7a3e22 80%, #6a3018 100%
          );
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: end;
          overflow: hidden;
          position: relative;
        }
        .hero-left {
          display: flex; flex-direction: column; justify-content: center;
          padding: 120px 60px 80px 80px;
          align-self: center;
        }

        .hero-name {
          font-family: 'Poppins', sans-serif;
          font-size: clamp(48px, 6vw, 84px);
          font-weight: 800; line-height: 1.05;
          letter-spacing: -0.035em;
          color: rgba(255,245,235,0.97);
          margin-bottom: 20px;
          text-shadow: 0 2px 24px rgba(0,0,0,0.18);
        }
        .hero-sub {
          font-size: 14px; font-weight: 400; line-height: 1.7;
          color: rgba(255,235,210,0.75); max-width: 400px; margin-bottom: 0;
        }
        .hero-icons {
          display: flex; gap: 12px;
        }
        .icon-btn {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; color: rgba(20,12,5,0.65);
          backdrop-filter: blur(8px); transition: all 0.25s;
        }
        .icon-btn:hover {
          background: rgba(255,255,255,0.9);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        /* Right side photo */
        .hero-right {
          display: flex; align-items: flex-end; justify-content: center;
          height: 100vh; padding-bottom: 0;
          position: relative;
        }
        .hero-right::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            #8c4e2e 0%,
            rgba(140,78,46,0.7) 18%,
            rgba(140,78,46,0.15) 45%,
            transparent 70%
          );
          pointer-events: none;
          z-index: 1;
        }
        .hero-photo-main {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }

        /* ── ABOUT ── */
        .about {
          background: linear-gradient(180deg, #d0e6f5 0%, #daeaf7 40%, #e8f0f8 100%);
          padding: 100px 80px 100px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;
        }
        .about-photo-wrap {
          display: flex; justify-content: center; align-items: stretch;
        }
        .about-photo-card {
          width: 100%; max-width: 440px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.12);
          aspect-ratio: 3/4;
        }
        .about-photo-card img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }
        .section-eyebrow {
          font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(20,12,5,0.4);
          margin-bottom: 16px;
        }
        .section-title {
          font-size: clamp(36px, 4vw, 52px); font-weight: 700;
          letter-spacing: -0.03em; color: rgba(15,8,0,0.82);
          line-height: 1.1; margin-bottom: 28px;
        }
        .body-text {
          font-size: 14px; font-weight: 400; line-height: 1.85;
          color: rgba(20,12,5,0.58); margin-bottom: 18px;
        }
        .award-pill {
          display: inline-flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.9);
          backdrop-filter: blur(10px); border-radius: 14px;
          padding: 14px 20px; margin-top: 20px;
          font-size: 12px; font-weight: 500; color: rgba(20,12,5,0.65); line-height: 1.5;
        }

        /* ── QUOTE ── */
        .quote-section {
          background: linear-gradient(160deg, #1a0a08 0%, #2a1208 40%, #3a1a0a 70%, #280a04 100%);
          padding: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 70vh;
          overflow: hidden;
        }
        .quote-left {
          display: flex; flex-direction: column; justify-content: center;
          padding: 100px 72px;
        }
        .quote-text {
          font-size: clamp(24px, 2.8vw, 40px); font-weight: 300; font-style: italic;
          line-height: 1.5; color: rgba(255,235,210,0.92);
        }
        .quote-attr { display: none; }
        .quote-photo-wrap {
          position: relative; overflow: hidden;
        }
        .quote-photo-wrap img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center top;
          display: block;
          filter: brightness(0.85) saturate(1.1);
        }
        .quote-photo-wrap::before {
          content: '';
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(
            to right,
            #1a0a08 0%,
            rgba(26,10,8,0.5) 30%,
            transparent 60%
          );
        }
        @media (max-width: 900px) {
          .quote-section { grid-template-columns: 1fr; }
          .quote-photo-wrap { height: 320px; }
          .quote-left { padding: 80px 32px; }
        }

        /* ── PITCH SECTION ── */
        .pitch-section {
          background: #f5f0eb;
          padding: 100px 80px;
        }
        .pitch-inner {
          max-width: 1000px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
          align-items: center;
        }
        .pitch-photos {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
          align-items: end;
        }
        .pitch-photo-main {
          border-radius: 18px; overflow: hidden;
          box-shadow: 0 16px 48px rgba(0,0,0,0.12);
          aspect-ratio: 3/4;
        }
        .pitch-photo-main img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: top center;
          display: block;
        }
        .pitch-photo-accent {
          border-radius: 18px; overflow: hidden;
          box-shadow: 0 12px 36px rgba(0,0,0,0.1);
          aspect-ratio: 2/3;
          margin-bottom: 32px;
        }
        .pitch-photo-accent img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: top;
          display: block;
        }
        .pitch-text .section-eyebrow { color: rgba(20,12,5,0.4); }
        .pitch-text .section-title { color: rgba(15,8,0,0.82); }
        .pitch-text .body-text { color: rgba(20,12,5,0.55); }
        .pitch-tag {
          display: inline-block;
          background: rgba(200,80,50,0.1); border: 1px solid rgba(200,80,50,0.2);
          color: rgba(180,60,30,0.85); border-radius: 8px;
          padding: 5px 12px; font-size: 11px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase; margin-top: 20px;
        }
        @media (max-width: 900px) {
          .pitch-section { padding: 80px 32px; }
          .pitch-inner { grid-template-columns: 1fr; }
          .pitch-photos { max-width: 340px; }
        }

        /* ── EXPERIENCE ── */
        .exp-section {
          background: linear-gradient(180deg,
            #a898bc 0%, #b8a0b0 25%, #c8a8a0 50%, #c09888 75%, #b08878 100%
          );
          padding: 100px 80px;
        }
        .exp-header { text-align: center; margin-bottom: 72px; }
        .exp-title {
          font-size: clamp(44px, 6vw, 72px); font-weight: 700;
          letter-spacing: -0.04em; color: rgba(255,255,255,0.92); margin-bottom: 14px;
        }
        .exp-sub { font-size: 13px; color: rgba(255,255,255,0.55); font-weight: 400; }

        .timeline { max-width: 760px; margin: 0 auto; position: relative; }
        .timeline::before {
          content: ''; position: absolute;
          left: 110px; top: 12px; bottom: 12px;
          width: 1px; background: rgba(255,255,255,0.2);
        }
        .tl-item { display: flex; gap: 28px; margin-bottom: 28px; align-items: flex-start; }
        .tl-date {
          font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500;
          width: 94px; flex-shrink: 0; padding-top: 18px; text-align: right;
        }
        .tl-dot {
          width: 12px; height: 12px; border-radius: 50%;
          background: rgba(255,255,255,0.7);
          border: 2px solid rgba(255,255,255,0.3);
          flex-shrink: 0; margin-top: 20px; position: relative; z-index: 1;
        }
        .tl-dot.active {
          background: #fff; box-shadow: 0 0 0 4px rgba(255,255,255,0.2);
        }
        .tl-card {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(12px); border-radius: 14px;
          padding: 18px 22px; flex: 1;
        }
        .tl-company {
          font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
          color: rgba(15,8,0,0.82); margin-bottom: 2px;
        }
        .tl-role {
          font-size: 11px; font-weight: 500; color: rgba(20,12,5,0.45);
          margin-bottom: 10px; letter-spacing: 0.05em; text-transform: uppercase;
        }
        .tl-desc {
          font-size: 12px; color: rgba(20,12,5,0.58); line-height: 1.8; font-weight: 400;
        }

        /* ── EDUCATION ── */
        .edu-section {
          background: linear-gradient(180deg, #b08878 0%, #a07868 100%);
          padding: 100px 80px;
        }
        .edu-grid {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 20px; max-width: 860px; margin: 48px auto 0;
        }
        .edu-card {
          background: rgba(255,255,255,0.8); backdrop-filter: blur(12px);
          border-radius: 16px; padding: 26px;
        }
        .edu-date {
          font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(20,12,5,0.35); margin-bottom: 10px;
        }
        .edu-degree {
          font-size: 17px; font-weight: 700; letter-spacing: -0.02em;
          color: rgba(15,8,0,0.82); margin-bottom: 4px;
        }
        .edu-school { font-size: 12px; color: rgba(20,12,5,0.5); margin-bottom: 12px; }
        .edu-grade { font-size: 14px; font-weight: 700; color: rgba(20,12,5,0.65); }

        /* ── SKILLS ── */
        .skills-section {
          background: linear-gradient(180deg, #a07868 0%, #907060 100%);
          padding: 100px 80px;
        }
        .skills-grid {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 20px; max-width: 860px; margin: 48px auto 0;
        }
        .skill-group h4 {
          font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 14px;
        }
        .skill-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .skill-tag {
          font-size: 11px; font-weight: 500;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25); border-radius: 8px;
          padding: 6px 12px; color: rgba(255,255,255,0.85);
        }

        /* ── CONTACT ── */
        .contact-section {
          background: linear-gradient(180deg, #907060 0%, #806050 100%);
          padding: 120px 80px; text-align: center;
        }
        .contact-title {
          font-size: clamp(44px, 6vw, 72px); font-weight: 700;
          letter-spacing: -0.04em; color: rgba(255,255,255,0.9); margin-bottom: 20px;
        }
        .contact-links { display: flex; flex-direction: column; gap: 14px; margin-top: 36px; }
        .contact-link {
          font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.7);
          text-decoration: none; transition: color 0.2s;
        }
        .contact-link:hover { color: #fff; }

        /* ── FOOTER ── */
        .footer {
          background: rgba(0,0,0,0.2); padding: 24px 48px;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 11px; color: rgba(255,255,255,0.4); flex-wrap: wrap; gap: 8px;
        }
        .footer a { color: rgba(255,255,255,0.4); text-decoration: none; }
        .footer a:hover { color: rgba(255,255,255,0.8); }
        .footer-links { display: flex; gap: 24px; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; }
          .hero-right { display: none; }
          .hero-left { padding: 120px 32px 60px; }
          .about { grid-template-columns: 1fr; padding: 80px 32px; }
          .about-photo-wrap { display: none; }
          .exp-section, .edu-section, .skills-section, .contact-section { padding: 80px 32px; }
          .edu-grid { grid-template-columns: 1fr; }
          .skills-grid { grid-template-columns: 1fr 1fr; }
          .nav { padding: 16px 24px; }
          .nav-links { display: none; }
          .quote-section { padding: 80px 32px; }
          .footer { padding: 20px 24px; }
        }

        /* ── Print Styles for PDF ── */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .nav, .side-icons { display: none !important; }
          .hero { min-height: auto; page-break-after: always; padding-bottom: 50px; }
          .hero-right { height: auto; }
          .quote-section { page-break-inside: avoid; }
          .exp-section, .edu-section, .skills-section, .pitch-section { page-break-inside: avoid; }
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <span className="nav-name">Julian Heinrich</span>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#experience">Experience</a>
          <a href="#education">Education</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      {/* Fixed side icons */}
      <div className="side-icons">
        <a href="mailto:julianhallo22@gmail.com" className="icon-btn" title="E-Mail">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </a>
        <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" className="icon-btn" title="LinkedIn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
            <rect x="2" y="9" width="4" height="12"/>
            <circle cx="4" cy="4" r="2"/>
          </svg>
        </a>
        <a href={MAITR} target="_blank" rel="noopener noreferrer" className="icon-btn" title="maitr.de">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </a>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-name">Julian<br />Heinrich</h1>
          <p className="hero-sub">
            Product Manager @ epilot · Wirtschaftsinformatik M.Sc.<br />
            Pitch-Gewinner REACH Euregio · Münster
          </p>
        </div>
        <div className="hero-right">
          <img src="/julian-wall.jpg" alt="Julian Heinrich" className="hero-photo-main" />
        </div>
      </section>

      {/* About */}
      <section id="about" className="about">
        <div className="about-photo-wrap">
          <div className="about-photo-card">
            <img src="/julian-boat.jpg" alt="Julian Heinrich" />
          </div>
        </div>
        <div>
          <div className="section-eyebrow">About me</div>
          <h2 className="section-title">Hey, ich bin<br />Julian.</h2>
          <p className="body-text">
            23, aus Berlin, jetzt in Münster. Ich habe meinen Bachelor der
            Wirtschaftsinformatik an der HTW Berlin abgeschlossen und bin gerade im
            Master an der FH Münster.
          </p>
          <p className="body-text">
            Schon im zweiten Semester habe ich angefangen, im Bereich IT & FinTech zu
            arbeiten. Was mich wirklich antreibt: mit Menschen ins Gespräch kommen,
            Probleme verstehen und gemeinsam lösen. Ein Unternehmen ist nur so gut wie
            seine Mitarbeiter und ihre Passion für das, was sie erschaffen.
          </p>
          <div className="award-pill">
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>Pitch-Gewinner — REACH Euregio Start-up Center</strong>
              <span style={{ fontSize: 11, opacity: 0.75 }}>Initiative der WWU Münster, FH Münster & des Landes NRW</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pitch Award Section */}
      <section className="pitch-section">
        <div className="pitch-inner">
          <div className="pitch-photos">
            <div className="pitch-photo-main">
              <img src="/julian-pitch.png" alt="Julian beim Pitch-Wettbewerb" />
            </div>
            <div className="pitch-photo-accent">
              <img src="/julian-pitch2.png" alt="Julian" />
            </div>
          </div>
          <div className="pitch-text">
            <div className="section-eyebrow">Auszeichnung</div>
            <h2 className="section-title">Pitch-<br />Gewinner.</h2>
            <p className="body-text">
              Gewinner des Pitch-Wettbewerbs beim REACH Euregio Start-up Center —
              einer Initiative der WWU Münster, FH Münster und des Landes NRW.
            </p>
            <p className="body-text">
              Präsentation und Sieg mit einer eigenen Geschäftsidee vor einer
              Fach-Jury. Der Wettbewerb fördert Gründungsgeist und Innovation
              in der Euregio-Region.
            </p>
            <span className="pitch-tag">REACH Euregio · 2026</span>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="quote-section">
        <div className="quote-left">
          <blockquote className="quote-text">
            „Ich liebe es, Probleme zu identifizieren und zu lösen – besonders den Weg zur Lösung und die Menschen, die mir dabei begegnen.“
          </blockquote>
          <p className="quote-attr">Julian Heinrich</p>
        </div>
        <div className="quote-photo-wrap">
          <img src="/julian-market.jpg" alt="Julian auf Reisen" />
        </div>
      </section>

      {/* Experience */}
      <section id="experience" className="exp-section">
        <div className="exp-header">
          <h2 className="exp-title">Experience</h2>
          <p className="exp-sub">Meine berufliche Reise.</p>
        </div>
        <div className="timeline">
          {[
            { date: "2026 – Heute", company: "epilot", role: "Product Manager", desc: "Agiles Teamumfeld, Konzeption und Vorantreiben neuer Features, intensiver Kundenkontakt, Markt- und Nutzerresearch", active: true },
            { date: "2026 – Heute", company: "Bodysoul Münster", role: "Spinning Coach", desc: "Planung und Durchführung von Spinning-Kursen, Motivation der Teilnehmer", active: true },
            { date: "2024 – 2026", company: "Goldbeck GmbH", role: "Projektmanagement", desc: "Projektprozesse steuern, Sprint-Planung, Qualitätssicherung, KPI-Management", active: false },
            { date: "2021 – 2024", company: "Europace AG", role: "Anwendungsbetreuer BaufiLead", desc: "Technischer Support BaufiLead und TAV, Partnerakquise, 2nd und 3rd-Level-Support", active: false },
            { date: "2019 – 2021", company: "Edeka", role: "Werkstudent", desc: "Erste Berufserfahrung parallel zum Studium", active: false },
          ].map((item) => (
            <div key={item.company + item.role} className="tl-item">
              <div className="tl-date">{item.date}</div>
              <div className={`tl-dot${item.active ? " active" : ""}`} />
              <div className="tl-card">
                <div className="tl-company">{item.company}</div>
                <div className="tl-role">{item.role}</div>
                <div className="tl-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section id="education" className="edu-section">
        <div className="exp-header">
          <h2 className="exp-title">Education</h2>
        </div>
        <div className="edu-grid">
          {[
            { date: "2024 – Heute", degree: "Master Wirtschaftsinformatik", school: "FH Münster", grade: "Ø 1,9" },
            { date: "2020 – 2024", degree: "Bachelor Wirtschaftsinformatik", school: "HTW Berlin", grade: "Ø 2,3 · Thesis 1,7" },
            { date: "bis 2020", degree: "Allgemeine Hochschulreife", school: "Andreas Gymnasium, Berlin", grade: "2,7" },
          ].map((e) => (
            <div key={e.degree} className="edu-card">
              <div className="edu-date">{e.date}</div>
              <div className="edu-degree">{e.degree}</div>
              <div className="edu-school">{e.school}</div>
              <div className="edu-grade">{e.grade}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section className="skills-section">
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 className="exp-title">Skills</h2>
          <div className="skills-grid">
            {[
              { title: "Methoden", tags: ["Scrum", "DevOps", "Projektmanagement", "Agile"] },
              { title: "Technologien", tags: ["Python", "Java", "Rust", "Jira", "APIs"] },
              { title: "Soft Skills", tags: ["Kundenkontakt", "Teamführung", "Problemlösung"] },
              { title: "Interessen", tags: ["Reisen", "Beachvolleyball", "Spinning", "Start-ups", "FinTech"] },
            ].map((g) => (
              <div key={g.title} className="skill-group">
                <h4>{g.title}</h4>
                <div className="skill-tags">
                  {g.tags.map((t) => <span key={t} className="skill-tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="contact-section">
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h2 className="contact-title">Let's talk.</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
            Immer offen für spannende Gespräche, neue Projekte und gute Ideen.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <span>© 2026 Julian Heinrich</span>
        <div className="footer-links">
          <a href="/impressum">Impressum</a>
          <a href="/datenschutz">Datenschutz</a>
        </div>
      </footer>
    </div>
  );
}
