import { Request, Response } from "express";

function pickColorsFromUrl(url: string | null) {
  // Basic heuristics: choose palette based on domain TLD or keywords
  if (!url) return ["#2563EB", "#F8FAFC"];
  const u = url.toLowerCase();
  if (u.includes("coffee") || u.includes("cafe") || u.includes("espresso")) return ["#D97706", "#FFFBEB"]; // amber
  if (u.includes("restaurant") || u.includes("food") || u.includes("menu")) return ["#DC2626", "#FFF1F2"]; // red
  if (u.includes("bar") || u.includes("cocktail")) return ["#7C3AED", "#EEF2FF"]; // purple
  return ["#2563EB", "#F8FAFC"];
}

function detectPos(url: string | null, mapsLink: string | null, businessName: string | null) {
  const text = [url, mapsLink, businessName].filter(Boolean).join(" ").toLowerCase();
  const known = ["sumup", "lightspeed", "gastrofix", "square", "verifone"]; 
  for (const k of known) {
    if (text.includes(k)) return { system: k.charAt(0).toUpperCase() + k.slice(1), status: "connected", capabilities: ["menu_sync", "inventory_sync"] };
  }
  return { status: "pending" };
}

export const handleAutogen = async (req: Request, res: Response) => {
  try {
    const { url = null, maps_link = null, business_name = null, file_name = null, file_base64 = null } = req.body || {};

    // Basic extraction heuristics
    const business = {
      name: business_name || (url ? (() => {
        try {
          const u = new URL(url);
          const host = u.hostname.replace(/^www\./, '').split('.').slice(0, -1).join('.') || u.hostname;
          return host.replace(/[-_]/g, ' ');
        } catch { return null; }
      })() : null) || "Unnamed Business",
      category: null as string | null,
      description: null as string | null,
      address: null as string | null,
      phone: null as string | null,
      email: null as string | null,
      opening_hours: {} as Record<string, string>,
      social: {} as Record<string, string>,
    };

    // Derive category from url or maps link or name
    const heur = (business_name || url || maps_link || "").toLowerCase();
    if (heur.includes("cafe") || heur.includes("coffee")) business.category = "Café";
    else if (heur.includes("restaurant") || heur.includes("resto") || heur.includes("bistro")) business.category = "Restaurant";
    else if (heur.includes("bar") || heur.includes("pub")) business.category = "Bar";
    else if (heur.includes("gym") || heur.includes("fitness")) business.category = "Gym";
    else if (heur.includes("salon") || heur.includes("hair") || heur.includes("spa")) business.category = "Salon";
    else business.category = "Local Business";

    // Basic description
    business.description = `${business.name} is a ${business.category.toLowerCase()} serving the local community.`;

    // If maps link is provided, try to extract address-like piece
    if (maps_link && typeof maps_link === 'string') {
      // attempt to extract 'place' text from the URL
      const m = maps_link.match(/@([\d\.-]+),([\d\.-]+)/);
      if (m) {
        business.address = `Coordinates: ${m[1]}, ${m[2]}`;
      } else {
        business.address = null;
      }
    }

    // If file indicates menu uploaded, attempt basic menu parse
    let menu_items: any[] = [];
    if (file_name) {
      // Very basic parsing: treat filename keywords
      if (/drink|cocktail|wine|beer/i.test(file_name)) {
        menu_items.push({ category: "Drinks", name: "Sample Drink", price: "5.00" });
      } else if (/menu|dish|starters|mains|dessert|food/i.test(file_name)) {
        menu_items.push({ category: "Starters", name: "Sample Starter", price: "6.50" });
        menu_items.push({ category: "Mains", name: "Sample Main", price: "12.90" });
      } else {
        menu_items.push({ category: "Menu", name: "Sample Item", price: "9.90" });
      }
    }

    const colors = pickColorsFromUrl(url);

    const seo = {
      meta_title: `${business.name} | ${business.category}`.slice(0, 60),
      meta_description: (business.description || "").slice(0, 160),
      keywords: [business.category, "local", "menu", "contact", business.name].filter(Boolean).slice(0, 10),
    };

    const pos = detectPos(url, maps_link, business_name);

    const modules = {
      menu: menu_items.length > 0,
      reviews: Boolean(maps_link),
      map: Boolean(maps_link),
      gallery: Boolean(file_base64),
      contact: true,
    };

    const style = {
      colors,
      logo_url: null,
      font: "Inter",
      gallery: menu_items.length === 0 ? [] : [],
    };

    const output = {
      mode: "auto",
      business,
      style,
      modules,
      menu_items,
      seo,
      pos_integration: pos,
      sources: {
        url: url || null,
        maps_link: maps_link || null,
        file_name: file_name || null,
      },
    };

    return res.json(output);
  } catch (error) {
    console.error("Autogen error:", error);
    return res.status(500).json({ error: "Autogen failed" });
  }
};
