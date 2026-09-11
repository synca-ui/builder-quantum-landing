/**
 * Betriebsprofil und Speisekarte aus einer veröffentlichten Konfiguration.
 *
 * ANLASS: Beim Veröffentlichen entstand der Betrieb (`Business`) bisher nur mit
 * Name, Adresse, Vorlage und drei Farben. Alles, was die Analyse und der
 * Konfigurator sonst erhoben hatten - Slogan, Beschreibung, Logo, Adresse,
 * Telefon, Öffnungszeiten, soziale Netze, die Speisekarte - blieb in der
 * Web-App und erreichte die Maitr-App nie. Wer sich dort mit demselben Konto
 * anmeldete, sah einen Betrieb, der nur seinen Namen kannte, und wurde im
 * Onboarding erneut nach Öffnungszeiten gefragt, die längst bekannt waren.
 *
 * Diese Datei ist REIN: keine Datenbank, keine Requests. Sie nimmt die
 * Konfiguration, wie `POST /api/apps/publish` sie bekommt (verschachtelt aus
 * dem Konfigurator ODER flach aus Altbestand), und liefert genau die Felder,
 * die `Business` und die Speisekarten-Tabellen tragen. Die Datenbank-Seite
 * liegt in BusinessService.ts.
 */
import { DAYS } from "@maitr/core/types";
import { StrictOpeningHoursSchema } from "../schemas/configuration";
import type { OpeningHours } from "@maitr/core/types";

/** Was `Business` über die Grundfelder hinaus aus der Veröffentlichung erfährt. */
export interface BusinessProfil {
  tagline?: string;
  description?: string;
  cuisine?: string;
  logoUrl?: string;
  openingHours?: OpeningHours;
  socialLinks?: Record<string, string>;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
  };
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  tags?: string[];
}

export interface SpeisekartenPosition {
  name: string;
  description?: string;
  /** In Euro. 0, wenn die Karte keinen Preis nennt. */
  price: number;
  imageUrl?: string;
}

export interface SpeisekartenKategorie {
  name: string;
  items: SpeisekartenPosition[];
}

/** Erste nicht-leere Zeichenkette, getrimmt - sonst undefined. */
function text(...werte: unknown[]): string | undefined {
  for (const w of werte) {
    if (typeof w === "string" && w.trim()) return w.trim();
  }
  return undefined;
}

/** Nur echte Web-Adressen - `data:`-URLs und Platzhalter bleiben draußen. */
function bildAdresse(wert: unknown): string | undefined {
  const s = text(wert);
  if (!s || !/^https?:\/\//i.test(s)) return undefined;
  if (/^https?:\/\/example\.com\//i.test(s)) return undefined;
  return s;
}

/**
 * Öffnungszeiten des Konfigurators → die enge Form von `Business.openingHours`.
 *
 * Der Konfigurator erlaubt jeden Tagesschlüssel und jede Ziffernfolge; die
 * App und das öffentliche Gastprofil verlangen DAYS und echte Uhrzeiten
 * (`StrictOpeningHoursSchema`). Was nicht passt, wird weggelassen statt
 * erfunden: Ein Tag mit `closed: true` wird Ruhetag, ein Tag ohne gültige
 * Zeiten fällt weg. Ergibt das keinen einzigen Tag, kommt undefined zurück
 * und die Spalte bleibt unberührt.
 */
export function strengeOeffnungszeiten(quelle: unknown): OpeningHours | undefined {
  if (!quelle || typeof quelle !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [roherTag, wert] of Object.entries(quelle as Record<string, unknown>)) {
    const tag = roherTag.trim().toLowerCase();
    if (!(DAYS as readonly string[]).includes(tag)) continue;
    if (!wert || typeof wert !== "object") continue;
    const w = wert as { open?: unknown; close?: unknown; closed?: unknown };
    if (w.closed === true) {
      out[tag] = { closed: true };
      continue;
    }
    const open = text(w.open);
    const close = text(w.close);
    if (!open || !close) continue;
    // schema.org-Ruhetag (00:00/00:00) ohne closed-Markierung - siehe
    // shared/openingHours.ts parseSchemaOpeningHours.
    if (open === "00:00" && close === "00:00") {
      out[tag] = { closed: true };
      continue;
    }
    out[tag] = { closed: false, open, close };
  }
  const geprueft = StrictOpeningHoursSchema.safeParse(out);
  if (!geprueft.success) return undefined;
  const tage = geprueft.data as OpeningHours;
  return Object.keys(tage).length ? tage : undefined;
}

/** Deutsche Postleitzahl aus einer Adresszeile ("Weyerstraße 96, 50676 Köln"). */
export function postleitzahlAus(adresse: string | undefined): string | undefined {
  if (!adresse) return undefined;
  return adresse.match(/\b(\d{5})\b/)?.[1];
}

/**
 * Betriebsprofil aus der Konfiguration. Verschachtelte Form (business/design/
 * content/contact - der Konfigurator) und flache Form (Altbestand) werden
 * beide gelesen, die verschachtelte gewinnt.
 */
export function betriebsprofilAusConfig(
  config: any,
  extras: { publishedUrl?: string; maitrScore?: number } = {},
): BusinessProfil {
  const business = config?.business ?? {};
  const contact = config?.contact ?? {};
  const content = config?.content ?? {};

  const profil: BusinessProfil = {};

  const tagline = text(business.slogan, config?.slogan);
  if (tagline) profil.tagline = tagline.slice(0, 200);

  const description = text(business.uniqueDescription, config?.uniqueDescription);
  if (description) profil.description = description.slice(0, 2000);

  const cuisine = text(business.type, config?.businessType);
  if (cuisine) profil.cuisine = cuisine.slice(0, 80);

  const logo = bildAdresse(business.logo?.url ?? config?.logo?.url);
  if (logo) profil.logoUrl = logo;

  const zeiten = strengeOeffnungszeiten(content.openingHours ?? config?.openingHours);
  if (zeiten) profil.openingHours = zeiten;

  const social = contact.socialMedia ?? contact.social ?? config?.socialMedia;
  if (social && typeof social === "object") {
    const links: Record<string, string> = {};
    for (const [kanal, url] of Object.entries(social as Record<string, unknown>)) {
      const s = text(url);
      if (s && /^https?:\/\//i.test(s)) links[kanal] = s;
    }
    if (Object.keys(links).length) profil.socialLinks = links;
  }

  // Telefon und E-Mail stehen im Konfigurator zweimal: als eigene Felder und
  // als Einträge in contactMethods. Beide Quellen lesen, die Felder gewinnen.
  const methoden: Array<{ type?: string; value?: string }> = Array.isArray(
    contact.contactMethods ?? contact.methods ?? config?.contactMethods,
  )
    ? (contact.contactMethods ?? contact.methods ?? config?.contactMethods)
    : [];
  const ausMethoden = (typ: string) =>
    methoden.find((m) => m?.type === typ && typeof m.value === "string")?.value;

  const kontakt: BusinessProfil["contactInfo"] = {};
  const phone = text(contact.phone, config?.phone, ausMethoden("phone"));
  if (phone) kontakt.phone = phone;
  const email = text(contact.email, config?.email, ausMethoden("email"));
  if (email) kontakt.email = email;
  const address = text(business.location, config?.location, ausMethoden("address"));
  if (address) kontakt.address = address;
  if (extras.publishedUrl) kontakt.website = extras.publishedUrl;
  if (Object.keys(kontakt).length) profil.contactInfo = kontakt;

  const plz = postleitzahlAus(address);
  if (plz) profil.postalCode = plz;

  const lat = Number(business.latitude ?? config?.latitude);
  const lng = Number(business.longitude ?? config?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    profil.latitude = lat;
    profil.longitude = lng;
  }

  return profil;
}

/**
 * Preis aus dem, was der Konfigurator speichert: "14.50", "14,50 €", 14.5.
 * Unlesbares wird 0 - die App zeigt dafür "auf Anfrage", keinen falschen Preis.
 */
export function preisAlsZahl(wert: unknown): number {
  if (typeof wert === "number") return Number.isFinite(wert) && wert >= 0 ? wert : 0;
  if (typeof wert !== "string") return 0;
  const m = wert.replace(/\s/g, "").match(/(\d+)(?:[.,](\d{1,2}))?/);
  if (!m) return 0;
  const zahl = Number(`${m[1]}.${(m[2] ?? "0").padEnd(2, "0")}`);
  return Number.isFinite(zahl) ? zahl : 0;
}

/**
 * Speisekarte aus der Konfiguration, gruppiert in der Reihenfolge der Karte.
 * Gerichte ohne Kategorie landen unter "Speisekarte". Leere Namen fallen weg.
 */
export function speisekarteAusConfig(config: any): SpeisekartenKategorie[] {
  const liste: unknown = config?.content?.menuItems ?? config?.menuItems;
  if (!Array.isArray(liste)) return [];

  const kategorien = new Map<string, SpeisekartenKategorie>();
  for (const roh of liste) {
    if (!roh || typeof roh !== "object") continue;
    const item = roh as Record<string, unknown>;
    const name = text(item.name);
    if (!name) continue;
    const kategorie = text(item.category) ?? "Speisekarte";
    let eintrag = kategorien.get(kategorie);
    if (!eintrag) {
      eintrag = { name: kategorie.slice(0, 120), items: [] };
      kategorien.set(kategorie, eintrag);
    }
    const position: SpeisekartenPosition = {
      name: name.slice(0, 200),
      price: preisAlsZahl(item.price),
    };
    const beschreibung = text(item.description);
    if (beschreibung) position.description = beschreibung.slice(0, 1000);
    const bild = bildAdresse(item.imageUrl ?? item.image);
    if (bild) position.imageUrl = bild;
    eintrag.items.push(position);
  }
  return [...kategorien.values()];
}
