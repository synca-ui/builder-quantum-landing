/**
 * Server-side Template Type Definitions
 * Mirrors client/components/template/TemplateRegistry.tsx for type safety
 * This ensures consistency between frontend and backend template handling
 */

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
