/**
 * Server-side Template Type Definitions
 * Mirrors client/components/template/TemplateRegistry.tsx for type safety
 * This ensures consistency between frontend and backend template handling
 */

// Design Tokens JSON structure from Prisma
export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
    border: string;
  };
  typography: {
    h1: { size: string; weight: number; lineHeight: string };
    h2: { size: string; weight: number; lineHeight: string };
    body: { size: string; weight: number; lineHeight: string };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Layout configuration JSON structure from Prisma
export interface TemplateLayout {
  intent: string;
  navigation: string;
  sections?: string[];
  typography?: {
    headingFont: string;
    bodyFont: string;
  };
}

// Preview information JSON structure from Prisma
export interface TemplatePreview {
  thumbnail?: string;
  features: string[];
}

export interface TemplateStyle {
  background: string;
  accent: string;
  text: string;
  secondary: string;
  layout: string;
  navigation: string;
  typography: string;
}

export interface TemplateMockup {
  nav: {
    bg: string;
    text: string;
    border: string;
  };
  hero: {
    bg: string;
    text: string;
  };
  cards: {
    bg: string;
    border: string;
    text: string;
  };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  businessTypes: string[];
  style: TemplateStyle;
  features: string[];
  mockup: TemplateMockup;
}

export interface TemplateTheme {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  highlight: string;
  buttonRadius: string;
  buttonHover: string;
}

export interface TemplateFilter {
  businessType?: string;
  category?: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors?: string[];
}
