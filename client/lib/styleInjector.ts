/**
 * Style Injector
 *
 * Generiert globale CSS-Variablen und Utility Classes
 * basierend auf Template-Tokens und User-Overrides.
 *
 * Diese Styles werden im <head> injiziert, damit Tailwind
 * darauf zugreifen kann.
 */

import { getTemplateTokens, getTemplateIntent, hexToRgb, type TemplateIntent } from './templateTokens';

export interface UserColorOverrides {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontColor: string;
  priceColor: string;
}

/**
 * Hauptfunktion: Generiert vollständige CSS für ein Template
 */
export function generateGlobalStyles(
  templateId: string,
  userColors: UserColorOverrides
): string {
  const tokens = getTemplateTokens(templateId);
  const intent = getTemplateIntent(templateId);

  // User-Overrides haben Priorität über Template-Tokens
  const finalColors = {
    primary: userColors.primaryColor || tokens.colors.primary,
    secondary: userColors.secondaryColor || tokens.colors.secondary,
    background: userColors.backgroundColor || tokens.colors.background,
    text: userColors.fontColor || tokens.colors.text,
    price: userColors.priceColor || "#059669", // Fallback
    accent: tokens.colors.accent,
    border: tokens.colors.border,
  };

  // RGB-Varianten für Transparenz
  const primaryRgb = hexToRgb(finalColors.primary);
  const secondaryRgb = hexToRgb(finalColors.secondary);
  const accentRgb = hexToRgb(finalColors.accent);

  return `
    /* ============================================ */
    /* CSS VARIABLES (ROOT) */
    /* ============================================ */
    
    :root {
      /* Base Colors (User Override Priority) */
      --color-primary: ${finalColors.primary};
      --color-primary-rgb: ${primaryRgb};
      --color-secondary: ${finalColors.secondary};
      --color-secondary-rgb: ${secondaryRgb};
      --color-background: ${finalColors.background};
      --color-text: ${finalColors.text};
      --color-price: ${finalColors.price};
      
      /* Template Tokens (aus CSV) */
      --color-accent: ${finalColors.accent};
      --color-accent-rgb: ${accentRgb};
      --color-border: ${finalColors.border};
      
      /* Spacing (aus CSV tokens.spacing) */
      --spacing-xs: ${tokens.spacing.xs};
      --spacing-sm: ${tokens.spacing.sm};
      --spacing-md: ${tokens.spacing.md};
      --spacing-lg: ${tokens.spacing.lg};
      --spacing-xl: ${tokens.spacing.xl};
      
      /* Typography (aus CSV tokens.typography) */
      --font-h1-size: ${tokens.typography.h1.size};
      --font-h1-weight: ${tokens.typography.h1.weight};
      --font-h1-line: ${tokens.typography.h1.lineHeight};
      --font-h2-size: ${tokens.typography.h2.size};
      --font-h2-weight: ${tokens.typography.h2.weight};
      --font-h2-line: ${tokens.typography.h2.lineHeight};
      --font-body-size: ${tokens.typography.body.size};
      --font-body-weight: ${tokens.typography.body.weight};
      --font-body-line: ${tokens.typography.body.lineHeight};
      
      /* Opacity Variants (für Glassmorphism + Overlays) */
      --color-primary-5: rgba(${primaryRgb}, 0.05);
      --color-primary-10: rgba(${primaryRgb}, 0.1);
      --color-primary-20: rgba(${primaryRgb}, 0.2);
      --color-primary-50: rgba(${primaryRgb}, 0.5);
      --color-primary-80: rgba(${primaryRgb}, 0.8);
      
      --color-secondary-5: rgba(${secondaryRgb}, 0.05);
      --color-secondary-10: rgba(${secondaryRgb}, 0.1);
      --color-secondary-20: rgba(${secondaryRgb}, 0.2);
      
      --color-white-5: rgba(255, 255, 255, 0.05);
      --color-white-10: rgba(255, 255, 255, 0.1);
      --color-white-15: rgba(255, 255, 255, 0.15);
      --color-white-20: rgba(255, 255, 255, 0.2);
      --color-white-50: rgba(255, 255, 255, 0.5);
      --color-white-80: rgba(255, 255, 255, 0.8);
      --color-white-90: rgba(255, 255, 255, 0.9);
      
      --color-black-5: rgba(0, 0, 0, 0.05);
      --color-black-10: rgba(0, 0, 0, 0.1);
      --color-black-20: rgba(0, 0, 0, 0.2);
      --color-black-40: rgba(0, 0, 0, 0.4);
      --color-black-60: rgba(0, 0, 0, 0.6);
      --color-black-70: rgba(0, 0, 0, 0.7);
      --color-black-80: rgba(0, 0, 0, 0.8);
    }
    
    /* ============================================ */
    /* TYPOGRAPHY UTILITIES */
    /* ============================================ */
    
    h1,
    .text-h1 {
      font-size: var(--font-h1-size);
      font-weight: var(--font-h1-weight);
      line-height: var(--font-h1-line);
    }
    
    h2,
    .text-h2 {
      font-size: var(--font-h2-size);
      font-weight: var(--font-h2-weight);
      line-height: var(--font-h2-line);
    }
    
    body,
    .text-body,
    p {
      font-size: var(--font-body-size);
      font-weight: var(--font-body-weight);
      line-height: var(--font-body-line);
    }
    
    /* ============================================ */
    /* COLOR UTILITIES */
    /* ============================================ */
    
    .bg-primary {
      background-color: var(--color-primary);
    }
    
    .text-primary {
      color: var(--color-primary);
    }
    
    .border-primary {
      border-color: var(--color-primary);
    }
    
    .bg-secondary {
      background-color: var(--color-secondary);
    }
    
    .text-secondary {
      color: var(--color-secondary);
    }
    
    .bg-accent {
      background-color: var(--color-accent);
    }
    
    .text-accent {
      color: var(--color-accent);
    }
    
    .border-accent {
      border-color: var(--color-accent);
    }
    
    .text-price {
      color: var(--color-price);
    }
    
    ${generateIntentSpecificStyles(intent)}
    
    /* ============================================ */
    /* RESPONSIVE ADJUSTMENTS */
    /* ============================================ */
    
    @media (max-width: 768px) {
      :root {
        --font-h1-size: calc(${tokens.typography.h1.size} * 0.7);
        --font-h2-size: calc(${tokens.typography.h2.size} * 0.75);
        --spacing-xl: calc(${tokens.spacing.xl} * 0.6);
        --spacing-lg: calc(${tokens.spacing.lg} * 0.7);
      }
      
      ${intent === 'VISUAL' ? `
      .card-glassmorphic,
      .nav-glassmorphic {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      ` : ''}
    }
    
    /* ============================================ */
    /* ACCESSIBILITY */
    /* ============================================ */
    
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    
    /* ============================================ */
    /* BROWSER COMPATIBILITY */
    /* ============================================ */
    
    /* Fallback für ältere Browser ohne backdrop-filter */
    @supports not (backdrop-filter: blur(12px)) {
      .card-glassmorphic,
      .nav-glassmorphic {
        background: var(--color-white-20);
        backdrop-filter: none;
      }
    }
  `;
}

/**
 * Intent-spezifische Styles (VISUAL, NARRATIVE, COMMERCIAL)
 */
function generateIntentSpecificStyles(intent: TemplateIntent): string {
  if (intent === 'VISUAL') {
    return `
    /* ============================================ */
    /* VISUAL INTENT - Glassmorphism & Overlays */
    /* ============================================ */
    
    .card-glassmorphic {
      background: var(--color-white-10);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--color-white-20);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }
    
    .card-glassmorphic:hover {
      background: var(--color-white-20);
      transform: scale(1.02);
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .nav-glassmorphic {
      background: var(--color-white-10);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--color-white-20);
    }
    
    .overlay-dark {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.2) 0%,
        transparent 50%,
        rgba(0, 0, 0, 0.1) 100%
      );
      pointer-events: none;
      z-index: 1;
    }
    
    /* ============================================ */
    /* ANIMATIONS (VISUAL) */
    /* ============================================ */
    
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slide-in-left {
      from {
        opacity: 0;
        transform: translateX(-40px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes scale-in {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes rotate-in {
      from {
        opacity: 0;
        transform: rotate(-5deg) scale(0.95);
      }
      to {
        opacity: 1;
        transform: rotate(0deg) scale(1);
      }
    }
    
    .animate-fade-in-up {
      animation: fade-in-up 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    .animate-slide-in-left {
      animation: slide-in-left 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    .animate-scale-in {
      animation: scale-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    .animate-rotate-in {
      animation: rotate-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    /* Staggered Delays */
    .stagger-1 { animation-delay: 0.1s; }
    .stagger-2 { animation-delay: 0.2s; }
    .stagger-3 { animation-delay: 0.3s; }
    .stagger-4 { animation-delay: 0.4s; }
    .stagger-5 { animation-delay: 0.5s; }
    .stagger-6 { animation-delay: 0.6s; }
    `;
  }

  if (intent === 'COMMERCIAL') {
    return `
    /* ============================================ */
    /* COMMERCIAL INTENT - Bold & CTA-Optimized */
    /* ============================================ */
    
    .card-solid {
      background: var(--color-background);
      border: 2px solid var(--color-border);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }
    
    .card-solid:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .nav-solid {
      background: var(--color-background);
      border-bottom: 2px solid var(--color-border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    /* ============================================ */
    /* ANIMATIONS (COMMERCIAL) */
    /* ============================================ */
    
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes scale-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .animate-fade-in-up {
      animation: fade-in-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    .animate-scale-in {
      animation: scale-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    .stagger-1 { animation-delay: 0.1s; }
    .stagger-2 { animation-delay: 0.2s; }
    .stagger-3 { animation-delay: 0.3s; }
    `;
  }

  // NARRATIVE Intent
  return `
    /* ============================================ */
    /* NARRATIVE INTENT - Clean & Minimal */
    /* ============================================ */
    
    .card-solid {
      background: var(--color-background);
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .card-solid:hover {
      background: var(--color-accent);
      transition: background-color 0.15s ease;
    }
    
    .nav-solid {
      background: var(--color-background);
      border-bottom: 1px solid var(--color-border);
    }
    
    /* Keine Animationen für NARRATIVE */
    .animate-fade-in-up,
    .animate-slide-in-left,
    .animate-scale-in {
      animation: none;
    }
  `;
}

// ============================================
// TEMPLATE TOKEN REGISTRY
// Design-DNA aus TemplateRegistry.tsx extrahiert
// ============================================

export interface TemplateDesignTokens {
  // Shape Tokens
  borderRadius: {
    card: string;
    button: string;
    input: string;
    modal: string;
  };
  // Shadow Tokens
  boxShadow: {
    card: string;
    cardHover: string;
    button: string;
    modal: string;
  };
  // Gradient Tokens
  gradients: {
    background: string;
    hero: string;
    overlay: string;
  };
  // Animation Tokens
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
}

/**
 * Design-DNA Token Registry pro Template
 * Basiert auf TemplateRegistry.tsx und seed-templates.ts
 */
const TEMPLATE_DESIGN_TOKENS: Record<string, TemplateDesignTokens> = {
  minimalist: {
    borderRadius: {
      card: '8px',
      button: '6px',
      input: '6px',
      modal: '12px',
    },
    boxShadow: {
      card: '0 1px 3px rgba(0, 0, 0, 0.05)',
      cardHover: '0 4px 12px rgba(0, 0, 0, 0.08)',
      button: 'none',
      modal: '0 20px 60px rgba(0, 0, 0, 0.15)',
    },
    gradients: {
      background: 'none',
      hero: 'none',
      overlay: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.02))',
    },
    transitions: {
      fast: '0.1s ease',
      normal: '0.2s ease',
      slow: '0.3s ease',
    },
  },
  modern: {
    borderRadius: {
      card: '16px',
      button: '12px',
      input: '10px',
      modal: '24px',
    },
    boxShadow: {
      card: '0 8px 32px rgba(0, 0, 0, 0.12)',
      cardHover: '0 16px 48px rgba(0, 0, 0, 0.18)',
      button: '0 4px 16px rgba(79, 70, 229, 0.3)',
      modal: '0 32px 80px rgba(0, 0, 0, 0.25)',
    },
    gradients: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      hero: 'linear-gradient(135deg, rgba(79,70,229,0.9) 0%, rgba(124,58,237,0.9) 100%)',
      overlay: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6))',
    },
    transitions: {
      fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      normal: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  stylish: {
    borderRadius: {
      card: '20px',
      button: '16px',
      input: '12px',
      modal: '28px',
    },
    boxShadow: {
      card: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
      cardHover: '0 16px 48px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
      button: '0 4px 20px rgba(5, 150, 105, 0.4)',
      modal: '0 40px 100px rgba(0, 0, 0, 0.3)',
    },
    gradients: {
      background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)',
      hero: 'linear-gradient(135deg, rgba(5,150,105,0.2) 0%, transparent 50%)',
      overlay: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
    },
    transitions: {
      fast: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      normal: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  cozy: {
    borderRadius: {
      card: '24px',
      button: '20px',
      input: '14px',
      modal: '32px',
    },
    boxShadow: {
      card: '0 4px 16px rgba(139, 111, 71, 0.08)',
      cardHover: '0 8px 24px rgba(139, 111, 71, 0.12)',
      button: '0 2px 8px rgba(234, 88, 12, 0.2)',
      modal: '0 24px 64px rgba(0, 0, 0, 0.15)',
    },
    gradients: {
      background: 'linear-gradient(180deg, #FFFBF0 0%, #FEF3E2 100%)',
      hero: 'linear-gradient(135deg, rgba(234,88,12,0.05) 0%, transparent 50%)',
      overlay: 'linear-gradient(to bottom, transparent, rgba(255,251,240,0.9))',
    },
    transitions: {
      fast: '0.15s ease-out',
      normal: '0.25s ease-out',
      slow: '0.4s ease-out',
    },
  },
};

/**
 * Gibt Design-Tokens für ein Template zurück
 */
export function getTemplateDesignTokens(templateId: string): TemplateDesignTokens {
  return TEMPLATE_DESIGN_TOKENS[templateId] || TEMPLATE_DESIGN_TOKENS.minimalist;
}

// ============================================
// STYLE INJECTION SYSTEM
// Injiziert CSS-Variablen in den DOM
// ============================================

const STYLE_ELEMENT_ID = 'maitr-injected-styles';

/**
 * Configuration Interface für injectGlobalStyles
 * Kompatibel mit domain.ts Configuration
 */
export interface StyleInjectionConfig {
  // Template ID
  template?: string;

  // Design Overrides
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontColor?: string;
  priceColor?: string;

  // Optional: Direct token overrides
  borderRadiusCard?: string;
  boxShadowCard?: string;
}

/**
 * HAUPTFUNKTION: Injiziert globale Styles basierend auf Configuration
 *
 * Wird aufgerufen in:
 * - AppRenderer.tsx beim Laden einer publizierten Seite
 * - TemplatePreviewContent.tsx beim Template-Wechsel
 * - Configurator.tsx bei Design-Änderungen
 *
 * @param config - Configuration-Objekt oder Teil davon
 * @param targetElement - Optional: Parent-Container statt :root
 */
export function injectGlobalStyles(
  config: StyleInjectionConfig,
  targetElement?: HTMLElement
): void {
  const templateId = config.template || 'minimalist';
  const designTokens = getTemplateDesignTokens(templateId);

  // User-Overrides zusammenbauen
  const userColors: UserColorOverrides = {
    primaryColor: config.primaryColor || '',
    secondaryColor: config.secondaryColor || '',
    backgroundColor: config.backgroundColor || '',
    fontColor: config.fontColor || '',
    priceColor: config.priceColor || '',
  };

  // Vollständige CSS generieren
  const css = generateGlobalStyles(templateId, userColors);

  // Design-Token CSS-Variablen generieren
  const tokenVars = `
    :root {
      /* Shape Tokens */
      --radius-card: ${config.borderRadiusCard || designTokens.borderRadius.card};
      --radius-button: ${designTokens.borderRadius.button};
      --radius-input: ${designTokens.borderRadius.input};
      --radius-modal: ${designTokens.borderRadius.modal};
      
      /* Shadow Tokens */
      --shadow-card: ${config.boxShadowCard || designTokens.boxShadow.card};
      --shadow-card-hover: ${designTokens.boxShadow.cardHover};
      --shadow-button: ${designTokens.boxShadow.button};
      --shadow-modal: ${designTokens.boxShadow.modal};
      
      /* Gradient Tokens */
      --gradient-background: ${designTokens.gradients.background};
      --gradient-hero: ${designTokens.gradients.hero};
      --gradient-overlay: ${designTokens.gradients.overlay};
      
      /* Transition Tokens */
      --transition-fast: ${designTokens.transitions.fast};
      --transition-normal: ${designTokens.transitions.normal};
      --transition-slow: ${designTokens.transitions.slow};
    }
  `;

  // Bestehenden Style-Tag entfernen oder erstellen
  let styleElement = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = STYLE_ELEMENT_ID;
    styleElement.setAttribute('data-maitr', 'injected');
    document.head.appendChild(styleElement);
  }

  // Styles setzen
  styleElement.textContent = tokenVars + css;

  // Optional: Auf spezifisches Element anwenden (für isolierte Previews)
  if (targetElement) {
    // CSS-Variablen auf Element-Ebene setzen
    targetElement.style.setProperty('--radius-card', config.borderRadiusCard || designTokens.borderRadius.card);
    targetElement.style.setProperty('--shadow-card', config.boxShadowCard || designTokens.boxShadow.card);
    targetElement.style.setProperty('--color-primary', config.primaryColor || '');
    targetElement.style.setProperty('--color-secondary', config.secondaryColor || '');
    targetElement.style.setProperty('--color-background', config.backgroundColor || '');
    targetElement.style.setProperty('--color-text', config.fontColor || '');
    targetElement.style.setProperty('--color-price', config.priceColor || '');
  }

  console.log(`[StyleInjector] Styles injected for template: ${templateId}`);
}

/**
 * Entfernt injizierte Styles (Cleanup)
 */
export function removeInjectedStyles(): void {
  const styleElement = document.getElementById(STYLE_ELEMENT_ID);
  if (styleElement) {
    styleElement.remove();
    console.log('[StyleInjector] Styles removed');
  }
}

/**
 * React Hook: Injiziert Styles bei Änderungen
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const design = useConfiguratorStore(s => s.design);
 *   useStyleInjection(design);
 *   return <div>...</div>;
 * }
 * ```
 */
export function useStyleInjection(config: StyleInjectionConfig): void {
  // Wird in React-Komponenten mit useEffect verwendet
  if (typeof window !== 'undefined') {
    injectGlobalStyles(config);
  }
}

/**
 * Utility: Extrahiert CSS-Variable aus dem DOM
 */
export function getCSSVariable(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Utility: Setzt CSS-Variable im DOM
 */
export function setCSSVariable(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(name, value);
}