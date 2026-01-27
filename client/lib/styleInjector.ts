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
