#!/usr/bin/env node
/*
  Simple generator to export a static React app (Vite) from a configuration JSON.
  Usage: node scripts/generate-static-app.cjs [path/to/config.json]
*/
const fs = require("fs");
const path = require("path");

const input =
  process.argv[2] || path.join(process.cwd(), "data", "configurations.json");
const outDir = path.join(process.cwd(), "out-static-app");

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch (e) {}
}

function loadConfig() {
  if (!fs.existsSync(input)) {
    console.error("Config file not found:", input);
    process.exit(1);
  }
  const raw = fs.readFileSync(input, "utf8");
  const parsed = JSON.parse(raw);
  // If array, pick first published or first
  if (Array.isArray(parsed)) {
    const pub = parsed.find((p) => p.status === "published");
    return pub || parsed[0];
  }
  return parsed;
}

const config = loadConfig();

// Create folders
ensureDir(outDir);
ensureDir(path.join(outDir, "src"));
ensureDir(path.join(outDir, "public"));

// package.json
fs.writeFileSync(
  path.join(outDir, "package.json"),
  JSON.stringify(
    {
      name: (config.businessName || "generated-app")
        .toLowerCase()
        .replace(/\s+/g, "-"),
      private: true,
      scripts: {
        dev: "vite",
        build: "vite build",
        start: "vite preview",
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        vite: "^4.0.0",
        "@vitejs/plugin-react": "^3.0.0",
      },
    },
    null,
    2,
  ),
);

// public/index.html
fs.writeFileSync(
  path.join(outDir, "public", "index.html"),
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.businessName || "Generated App"}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
);

// src/main.jsx
fs.writeFileSync(
  path.join(outDir, "src", "main.jsx"),
  `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)
`,
);

// src/App.jsx - minimal runtime renderer that consumes config.json
fs.writeFileSync(
  path.join(outDir, "src", "App.jsx"),
  `import React from 'react'
import config from './config.json'

export default function App(){
  const cfg = config;
  return (
    <div style={{ fontFamily: cfg.fontFamily || 'system-ui' }}>
      <header style={{ padding: 20, borderBottom: '1px solid #eee' }}>
        <h1 style={{ margin:0 }}>{cfg.businessName || 'Business'}</h1>
        <p style={{ margin:0, color:'#666' }}>{cfg.slogan || ''}</p>
      </header>
      <main style={{ padding: 20 }}>
        <section>
          <h2>About</h2>
          <p>{cfg.uniqueDescription || '...'}</p>
        </section>
        <section>
          <h2>Menu</h2>
          {Array.isArray(cfg.menuItems) && cfg.menuItems.length>0 ? (
            <ul>
              {cfg.menuItems.map(item => <li key={item.id||item.name}>{item.name} - {item.price ? '$'+item.price : ''}</li>)}
            </ul>
          ) : <p>No items</p>}
        </section>
      </main>
      <footer style={{ padding: 20, borderTop: '1px solid #eee', color:'#888' }}>© {new Date().getFullYear()} {cfg.businessName}</footer>
    </div>
  )
}
`,
);

// styles.css
fs.writeFileSync(
  path.join(outDir, "src", "styles.css"),
  `body { margin: 0; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
`,
);

// config.json copy
fs.writeFileSync(
  path.join(outDir, "src", "config.json"),
  JSON.stringify(config, null, 2),
);

console.log("\n✅ Static app exported to", outDir);
console.log("To run:");
console.log("  cd", outDir);
console.log("  npm install");
console.log("  npm run dev");
console.log(
  "\nThe generated app is minimal and uses the provided JSON (src/config.json). You can extend templates in src/App.jsx to match your renderer.",
);
