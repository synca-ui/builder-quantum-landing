import {
  Coffee,
  Utensils,
  ShoppingBag,
  Home,
  Camera,
  Heart,
  Calendar,
  Phone,
  Instagram,
  Facebook,
  Star,
  Building,
} from "lucide-react";

// Image Helper
export function normalizeImageSrc(img: any): string {
  if (!img) return "/placeholder.svg";
  if (typeof img === "string") return img;
  const url = img?.url;
  if (typeof url === "string") return url;
  const file = (img as any)?.file || img;
  if (typeof File !== "undefined" && file instanceof File)
    return URL.createObjectURL(file);
  return "/placeholder.svg";
}

// Data Constants
export const businessTypes = [
  {
    value: "cafe",
    label: "Café",
    icon: Coffee,
    gradient: "from-amber-400 to-orange-500",
  },
  {
    value: "restaurant",
    label: "Restaurant",
    icon: Utensils,
    gradient: "from-red-400 to-rose-500",
  },
  {
    value: "bar",
    label: "Bar",
    icon: ShoppingBag,
    gradient: "from-purple-500 to-indigo-600",
  },
];

export const fontOptions = [
  {
    id: "sans-serif",
    name: "Sans Serif",
    class: "font-sans",
    preview: "Modern & Clean",
    description: "Perfect for digital readability",
  },
  {
    id: "serif",
    name: "Serif",
    class: "font-serif",
    preview: "Classic & Elegant",
    description: "Traditional and sophisticated",
  },
  {
    id: "display",
    name: "Display",
    class: "font-mono",
    preview: "Bold & Creative",
    description: "Eye-catching and unique",
  },
];

export const pageOptions = [
  {
    id: "home",
    name: "Home",
    required: true,
    icon: Home,
  },
  {
    id: "menu",
    name: "Menu",
    icon: Coffee,
    condition: ["cafe", "restaurant", "bar"],
  },
  { id: "gallery", name: "Gallery", icon: Camera },
  { id: "about", name: "About", icon: Heart },
  {
    id: "reservations",
    name: "Reservations",
    icon: Calendar,
    condition: ["restaurant", "bar"],
  },
  { id: "contact", name: "Contact", icon: Phone },
];
