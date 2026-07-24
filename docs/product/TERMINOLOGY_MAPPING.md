# Terminology Mapping — Sync.a → Maitr

This document lists the recommended terminology changes for the rebranding from Sync.a to Maitr and guidance on where to apply them.

| Old Term                | New Term              | Where to use                                     | Notes                                                                                              |
| ----------------------- | --------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Sync.a / sync.a / Synca | Maitr                 | All user-facing UI, docs, headings, marketing    | Keep domain names and technical URLs unchanged (synca.digital) unless domain migration is planned. |
| Website / Websites      | App / Apps            | Landing page, CTAs, pricing, docs                | Emphasize "PWA / App" framing.                                                                     |
| Website Builder         | Zero-Input App Engine | Marketing copy, investor pitch                   | Use for higher-level positioning.                                                                  |
| Templates               | Vibes ✨              | Template registry, selection UI                  | More playful framing.                                                                              |
| Editor / Configurator   | Creative Studio 🎨    | Secondary label for the editor pages             | Keep internal route names as-is.                                                                   |
| Dashboard               | Dashboard (keep)      | Global navigation and pages                      | User requested to keep the word "Dashboard".                                                       |
| Publish / Publishing    | Publish (same)        | No change, but messaging may say "Publish App"   | Preserve publishing workflow.                                                                      |
| Subdomain               | Maitr subdomain       | PublishCard text and user-facing recommendations | Domain still technically `*.synca.digital` until migration.                                        |
| Support                 | Concierge 🛎️          | Help text, support wording                       | Optionally update support communications.                                                          |

## Guidance

- When updating copy, prefer altering user-facing strings only. Avoid changing code that references domains or environment variables unless a domain migration is authorized.
- Use the design tokens in `client/global.css` and `tailwind.config.ts` to preserve the "Friendly Magic" visual style (gradients, teal/purple/orange).
- Keep animations and the `.text-gradient`, `.glass`, and `.iphone-16pro` utilities intact to preserve brand personality.

## Checklist for editors

- [ ] Replace visible occurrences of "Sync.a" with "Maitr" in UI components
- [ ] Update landing hero and CTAs to emphasize "Your Restaurant App. Ready in 30 Seconds"
- [ ] Update docs (README, V2 guides) with the new product name and core sentence
- [ ] Leave technical URLs (synca.digital) unchanged unless instructed otherwise

---

Created as part of the Maitr rebranding effort.
