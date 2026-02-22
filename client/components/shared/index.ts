/**
 * Shared Components Index
 *
 * Zentrale Exports für alle wiederverwendbaren UI-Komponenten.
 * Diese Komponenten werden sowohl im Editor (TemplatePreviewContent)
 * als auch im Production Renderer (AppRenderer) verwendet.
 *
 * WICHTIG: Alle Komponenten nutzen CSS-Variablen für Styling:
 * - --radius-card, --radius-button, --radius-modal
 * - --shadow-card, --shadow-button, --shadow-modal
 * - --color-primary, --color-secondary, etc.
 */

// Navigation Components
export { Navigation, type NavigationProps } from "./Navigation";
export { MenuOverlay, type MenuOverlayProps } from "./MenuOverlay";

// Hero Section
export { Hero, type HeroProps } from "./Hero";
export { HeroSection, type HeroSectionProps } from "./HeroSection";

// Menu/Dish Components
export { DishCard, type DishCardProps } from "./DishCard";
export { DishModal, type DishModalProps } from "./DishModal";
export { CategoryFilter, type CategoryFilterProps } from "./CategoryFilter";
export { MenuSection, type MenuSectionProps, PriceTag } from "./MenuSection";

// Information Components
export { OpeningHours, type OpeningHoursProps } from "./OpeningHours";
export {
  BusinessHoursSection,
  type BusinessHoursSectionProps,
} from "./BusinessHoursSection";
export { ContactSection, type ContactSectionProps } from "./ContactSection";

// Re-export for convenience
export type {
  MenuItem,
  OpeningHours as OpeningHoursType,
  ContactInfo,
} from "@/types/domain";
