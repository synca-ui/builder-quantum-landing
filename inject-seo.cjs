const fs = require('fs');
const path = require('path');

const pages = [
  { file: 'client/pages/Index.tsx', title: 'Maitr - Web-App Builder für Restaurants', desc: 'Erstelle automatisch konfigurierte Web-Apps mit Maitr in 30 Sekunden.', noindex: false },
  { file: 'client/pages/CheckLanding.tsx', title: 'Maitr - Überprüfe dein Restaurant', desc: 'Analysiere deine Online-Präsenz mit Maitr.', noindex: false },
  { file: 'client/pages/demo/DemoDashboardHome.tsx', title: 'Maitr - Demo Dashboard', desc: 'Entdecke das Maitr Demo Dashboard.', noindex: false },
  { file: 'client/pages/Login.tsx', title: 'Maitr - Login', desc: 'Melde dich bei Maitr an.', noindex: true },
  { file: 'client/pages/Signup.tsx', title: 'Maitr - Registrieren', desc: 'Registriere dich bei Maitr.', noindex: true },
  { file: 'client/pages/ModeSelection.tsx', title: 'Maitr - Modus auswählen', desc: 'Wähle deinen Maitr Modus.', noindex: true },
  { file: 'client/pages/Impressum.tsx', title: 'Maitr - Impressum', desc: 'Impressum von Maitr.', noindex: false },
  { file: 'client/pages/Datenschutz.tsx', title: 'Maitr - Datenschutz', desc: 'Datenschutzerklärung von Maitr.', noindex: false },
  { file: 'client/pages/AGB.tsx', title: 'Maitr - AGB', desc: 'Allgemeine Geschäftsbedingungen von Maitr.', noindex: false },
  { file: 'client/pages/CheckImpressum.tsx', title: 'Maitr - Impressum (Check)', desc: 'Impressum von Maitr.', noindex: false },
  { file: 'client/pages/CheckDatenschutz.tsx', title: 'Maitr - Datenschutz (Check)', desc: 'Datenschutzerklärung von Maitr.', noindex: false }
];

pages.forEach(p => {
  const filePath = path.join(process.cwd(), p.file);
  if (!fs.existsSync(filePath)) {
    console.log(`Missing ${p.file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('<PageSEO')) {
    console.log(`Already has SEO ${p.file}`);
    return;
  }
  
  const importStatement = `import { PageSEO } from "@/components/seo/PageSEO";\n`;
  content = importStatement + content;
  
  const pageSeoComponent = `\n      <PageSEO title="${p.title}" description="${p.desc}" noindex={${p.noindex}} />\n`;
  
  let replaced = false;
  
  content = content.replace(/(return\s*\(\s*(?:<[A-Za-z0-9_.]+(?:>|\s[^>]*>)|<>))/, (match, p1) => {
    replaced = true;
    return p1 + pageSeoComponent;
  });

  if (!replaced) {
      content = content.replace(/(return\s*(?:<[A-Za-z0-9_.]+(?:>|\s[^>]*>)|<>))/, (match, p1) => {
        replaced = true;
        return p1 + pageSeoComponent;
      });
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${p.file}`);
});
