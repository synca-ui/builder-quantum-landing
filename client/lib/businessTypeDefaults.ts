/**
 * Business Type Defaults
 * 
 * Provides smart defaults for menu items, opening hours, and features
 * based on the selected business type (Café, Restaurant, Bar).
 */

import type { MenuItem, OpeningHours, FeatureFlags } from "@/types/domain";

// Generate unique IDs for default items
const generateId = () => `default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Default menu items per business type
 */
export const defaultMenuItems: Record<string, MenuItem[]> = {
  cafe: [
    {
      id: generateId(),
      name: "Cappuccino",
      description: "Cremiger Espresso mit aufgeschäumter Milch",
      price: "3.90",
      category: "Heißgetränke",
    },
    {
      id: generateId(),
      name: "Latte Macchiato",
      description: "Geschichteter Kaffee mit viel Milch",
      price: "4.20",
      category: "Heißgetränke",
    },
    {
      id: generateId(),
      name: "Croissant",
      description: "Frisch gebacken, buttrig und knusprig",
      price: "2.90",
      category: "Gebäck",
    },
    {
      id: generateId(),
      name: "Avocado Toast",
      description: "Mit Ei, Tomate und frischen Kräutern",
      price: "9.50",
      category: "Frühstück",
    },
    {
      id: generateId(),
      name: "Käsekuchen",
      description: "Hausgemacht nach Omas Rezept",
      price: "4.90",
      category: "Kuchen",
    },
    {
      id: generateId(),
      name: "Frische Limonade",
      description: "Mit Zitrone, Minze und Ingwer",
      price: "4.50",
      category: "Kaltgetränke",
    },
  ],
  restaurant: [
    {
      id: generateId(),
      name: "Wiener Schnitzel",
      description: "Zartes Kalbsschnitzel mit Kartoffelsalat",
      price: "18.90",
      category: "Hauptgerichte",
    },
    {
      id: generateId(),
      name: "Pasta Carbonara",
      description: "Mit Speck, Ei und Parmesan",
      price: "14.50",
      category: "Pasta",
    },
    {
      id: generateId(),
      name: "Rindersteak",
      description: "200g mit Kräuterbutter und Pommes",
      price: "24.90",
      category: "Hauptgerichte",
    },
    {
      id: generateId(),
      name: "Caesar Salad",
      description: "Mit gegrilltem Hähnchen und Croutons",
      price: "12.90",
      category: "Salate",
    },
    {
      id: generateId(),
      name: "Bruschetta",
      description: "Geröstetes Brot mit Tomaten und Basilikum",
      price: "7.50",
      category: "Vorspeisen",
    },
    {
      id: generateId(),
      name: "Tiramisu",
      description: "Klassisch italienisch mit Mascarpone",
      price: "6.90",
      category: "Desserts",
    },
  ],
  bar: [
    {
      id: generateId(),
      name: "Mojito",
      description: "Rum, Limette, Minze, Soda",
      price: "9.50",
      category: "Cocktails",
    },
    {
      id: generateId(),
      name: "Aperol Spritz",
      description: "Aperol, Prosecco, Soda",
      price: "8.50",
      category: "Cocktails",
    },
    {
      id: generateId(),
      name: "Old Fashioned",
      description: "Bourbon, Zucker, Angostura",
      price: "11.00",
      category: "Cocktails",
    },
    {
      id: generateId(),
      name: "Craft Beer",
      description: "Wechselnde Auswahl lokaler Brauereien",
      price: "5.50",
      category: "Bier",
    },
    {
      id: generateId(),
      name: "Nachos Grande",
      description: "Mit Käse, Jalapeños, Guacamole und Sour Cream",
      price: "12.90",
      category: "Snacks",
    },
    {
      id: generateId(),
      name: "Burger Deluxe",
      description: "Angus Beef mit Bacon und Cheddar",
      price: "15.90",
      category: "Snacks",
    },
  ],
};

/**
 * Default opening hours per business type
 */
export const defaultOpeningHours: Record<string, OpeningHours> = {
  cafe: {
    monday: { open: "07:30", close: "18:00", closed: false },
    tuesday: { open: "07:30", close: "18:00", closed: false },
    wednesday: { open: "07:30", close: "18:00", closed: false },
    thursday: { open: "07:30", close: "18:00", closed: false },
    friday: { open: "07:30", close: "18:00", closed: false },
    saturday: { open: "09:00", close: "17:00", closed: false },
    sunday: { open: "09:00", close: "17:00", closed: false },
  },
  restaurant: {
    monday: { open: "11:30", close: "22:00", closed: false },
    tuesday: { open: "11:30", close: "22:00", closed: false },
    wednesday: { open: "11:30", close: "22:00", closed: false },
    thursday: { open: "11:30", close: "22:00", closed: false },
    friday: { open: "11:30", close: "23:00", closed: false },
    saturday: { open: "17:00", close: "23:00", closed: false },
    sunday: { open: "12:00", close: "21:00", closed: true }, // Ruhetag
  },
  bar: {
    monday: { open: "18:00", close: "02:00", closed: true }, // Ruhetag
    tuesday: { open: "18:00", close: "02:00", closed: false },
    wednesday: { open: "18:00", close: "02:00", closed: false },
    thursday: { open: "18:00", close: "02:00", closed: false },
    friday: { open: "18:00", close: "04:00", closed: false },
    saturday: { open: "18:00", close: "04:00", closed: false },
    sunday: { open: "18:00", close: "00:00", closed: false },
  },
};

/**
 * Default feature flags per business type
 */
export const defaultFeatures: Record<string, Partial<FeatureFlags>> = {
  cafe: {
    reservationsEnabled: false, // Cafés brauchen meist keine Reservierung
    onlineOrderingEnabled: true, // Kaffee to-go bestellen
    onlineStoreEnabled: false,
    teamAreaEnabled: false,
  },
  restaurant: {
    reservationsEnabled: true, // Restaurants brauchen Reservierungen
    onlineOrderingEnabled: false,
    onlineStoreEnabled: false,
    teamAreaEnabled: false,
  },
  bar: {
    reservationsEnabled: true, // Tischreservierung für Gruppen
    onlineOrderingEnabled: false,
    onlineStoreEnabled: false,
    teamAreaEnabled: false,
  },
};

/**
 * Default categories per business type
 */
export const defaultCategories: Record<string, string[]> = {
  cafe: ["Heißgetränke", "Kaltgetränke", "Frühstück", "Gebäck", "Kuchen", "Snacks"],
  restaurant: ["Vorspeisen", "Salate", "Suppen", "Hauptgerichte", "Pasta", "Desserts", "Getränke"],
  bar: ["Cocktails", "Longdrinks", "Bier", "Wein", "Alkoholfrei", "Snacks"],
};

/**
 * Default pages to enable per business type
 */
export const defaultPages: Record<string, string[]> = {
  cafe: ["menu", "contact", "gallery"],
  restaurant: ["menu", "contact", "gallery", "reservations"],
  bar: ["menu", "contact", "gallery", "reservations"],
};

/**
 * Helper function to get all defaults for a business type
 */
export function getBusinessTypeDefaults(businessType: string) {
  const type = businessType.toLowerCase();
  
  // Generate fresh IDs for menu items
  const menuItems = (defaultMenuItems[type] || defaultMenuItems.restaurant).map(item => ({
    ...item,
    id: `default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }));
  
  return {
    menuItems,
    openingHours: defaultOpeningHours[type] || defaultOpeningHours.restaurant,
    features: defaultFeatures[type] || defaultFeatures.restaurant,
    categories: defaultCategories[type] || defaultCategories.restaurant,
    pages: defaultPages[type] || defaultPages.restaurant,
  };
}
