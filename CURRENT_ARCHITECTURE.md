# CURRENT_ARCHITECTURE.md - Template & Configurator Architecture Analysis

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Data Layer: Datenstruktur & Typen](#1-the-data-layer-datenstruktur--typen)
3. [The Logic Layer: State Flow & Live Preview](#2-the-logic-layer-state-flow--live-preview)
4. [The View Layer: Styling-Strategie](#3-the-view-layer-styling-strategie)
5. [Tech Debt: Identifizierte Probleme](#4-tech-debt-identifizierte-probleme)
6. [Source of Truth & Refactoring Roadmap](#5-source-of-truth--refactoring-roadmap)
7. [Appendix: File References](#appendix-file-references)

---

## Executive Summary

### Status Quo

Maitr's template and configurator system is currently built on **hardcoded TypeScript objects** that define 4 pre-built templates (Minimalist, Modern, Stylish, Cozy). The architecture works well for a **fixed set of templates** but suffers from significant **duplication and scaling limitations**.

**What Works:**

- ✅ Template selection and live preview are fully functional
- ✅ Form data is properly persisted to localStorage and server
- ✅ Each template has distinct visual styles and layouts
- ✅ Theme customization (colors, fonts) works smoothly
- ✅ Publishing/deployment flows are stable

**What Doesn't Work Well:**

- ❌ Template definitions are duplicated across 4 files (TemplateRegistry, Configurator, Site, Index)
- ❌ Adding new templates requires code changes in 4+ locations + new switch cases in components
- ❌ All templates are bundled as JavaScript (no lazy-loading or dynamic loading)
- ❌ No central theme management or admin UI
- ❌ Template IDs are hardcoded strings with no type safety

### Why This Matters

As the business grows and requires 10, 20, or 50+ templates, the current approach becomes **unmaintainable**. Each new template requires:

1. Adding object to 4 files (duplication risk)
2. Adding new switch-case to every component using templates (GalleryGrid, MenuSection, etc.)
3. Adding new theme to defaultTemplateThemes
4. Manual testing across all components

This document serves as a **diagnostic report** and blueprint for refactoring to a **JSON-based Theme Store architecture** that decouples template data from code.

---

## 1. The Data Layer: Datenstruktur & Typen

### 1.1 Template Interface Definition

**Location:** `client/components/template/TemplateRegistry.tsx` (Lines 3-50)

```typescript
export interface TemplateStyle {
  background: string; // Color or gradient, e.g., "#FFFFFF" or "linear-gradient(...)"
  accent: string; // Primary accent color, e.g., "#111827"
  text: string; // Default text color, e.g., "#111827"
  secondary: string; // Secondary accent color, e.g., "#F3F4F6"
  layout: string; // Layout semantic, e.g., "narrative-fullscreen", "modern-cards"
  navigation: string; // Navigation style, e.g., "overlay-hamburger", "glassmorphism"
  typography: string; // Typography style, e.g., "minimal-sans", "decorative-serif"
}

export interface TemplateMockup {
  nav: {
    bg: string; // Tailwind classes for nav background, e.g., "bg-white"
    text: string; // Tailwind classes for nav text, e.g., "text-black"
    border: string; // Tailwind classes for nav border, e.g., "border-transparent"
  };
  hero: {
    bg: string; // Tailwind classes for hero background
    text: string; // Tailwind classes for hero text
  };
  cards: {
    bg: string; // Tailwind classes for card background
    border: string; // Tailwind classes for card border
    text: string; // Tailwind classes for card text
  };
}

export interface Template {
  id: string; // Unique identifier, e.g., "minimalist", "modern"
  name: string; // Display name, e.g., "Minimalist"
  description: string; // User-facing description
  preview: string; // Tailwind gradient class for preview thumbnail
  businessTypes: string[]; // Array of applicable business types, e.g., ["cafe", "restaurant", "bar"]
  style: TemplateStyle; // Style configuration object
  features: string[]; // Feature tags shown in template selector UI
  mockup: TemplateMockup; // Pre-defined Tailwind classes for sections
}

export interface TemplateTheme {
  primary: string; // Primary color, e.g., "#2563EB"
  secondary: string; // Secondary color, e.g., "#7C3AED"
  text: string; // Text color, e.g., "#1A1A1A"
  background: string; // Background color, e.g., "#FFFFFF"
  highlight: string; // Highlight/accent color, e.g., "#14B8A6"
  buttonRadius: string; // Button border-radius class, e.g., "rounded-lg"
  buttonHover: string; // Button hover effect class, e.g., "grow"
}
```

### 1.2 Configuration Interface

**Location:** `client/lib/api.ts` (Lines 5-42)

```typescript
export interface Configuration {
  id?: string;
  userId: string;
  businessName: string;
  businessType: string;
  location?: string;
  slogan?: string;
  uniqueDescription?: string;
  template: string; // ← Template ID stored here (e.g., "minimalist")
  homepageDishImageVisibility?: string;
  primaryColor: string; // User's custom primary color override
  secondaryColor: string; // User's custom secondary color override
  fontFamily: string;
  selectedPages: string[];
  customPages: string[];
  openingHours: Record<string, any>;
  menuItems: any[];
  reservationsEnabled: boolean;
  maxGuests: number;
  notificationMethod: string;
  contactMethods: string[];
  socialMedia: Record<string, string>;
  gallery: any[];
  onlineOrdering: boolean;
  onlineStore: boolean;
  teamArea: boolean;
  hasDomain: boolean;
  domainName?: string;
  selectedDomain?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: "draft" | "published" | "archived";
  publishedUrl?: string;
  previewUrl?: string;
  paymentOptions?: string[];
  offers?: any[];
  offerBanner?: any;
}
```

**Key Point:** Configuration stores only the **template ID as a string** (e.g., `"minimalist"`), not the entire Template object.

### 1.3 FormData Structure (Persistence)

**Location:** `client/lib/stepPersistence.ts` (Lines 6-81)

```typescript
export interface StepData {
  stepNumber: number;
  stepId: string;
  timestamp: number;
  action:
    | "step_change"
    | "field_update"
    | "template_select"
    | "publish"
    | "save";
  data: any;
  formData: any;                 // ← Complete form state snapshot
}

export interface PersistenceState {
  steps: StepData[];
  currentStep: number;
  formData: any;                 // ← The actual form data being edited
  lastUpdated: number;
  sessionId: string;
  configId?: string;
  publishedUrl?: string;
}

// Default FormData structure (from getDefaultFormData() method):
{
  // Template Selection
  template: "",                  // ← Stored as empty string, later set to template ID

  // Business Information
  businessName: "",
  businessType: "",
  location: "",
  slogan: "",
  uniqueDescription: "",

  // Colors & Design
  primaryColor: "#2563EB",
  secondaryColor: "#7C3AED",
  fontFamily: "sans-serif",

  // Gallery, Menu, etc.
  gallery: [],
  menuItems: [],

  // ... ~25 more fields
}
```

**Key Point:** `formData.template` is a string ID that gets synchronized across:

- localStorage (via StepPersistence)
- server (via Configuration API)
- UI state (via React useState)

### 1.4 Template Definition Locations

**Critical Finding:** Templates are duplicated across 4 files:

| File                                              | Lines   | Type                                        | Status    | Source?             |
| ------------------------------------------------- | ------- | ------------------------------------------- | --------- | ------------------- |
| `client/components/template/TemplateRegistry.tsx` | 51-185  | `export const defaultTemplates: Template[]` | Primary   | ✅ YES - CANONICAL  |
| `client/pages/Configurator.tsx`                   | 487-620 | `const templates = [...]`                   | Duplicate | ❌ NO - OUT OF SYNC |
| `client/pages/Site.tsx`                           | 38-160  | `const templates = [...]`                   | Duplicate | ❌ NO - OUT OF SYNC |
| `client/pages/Index.tsx`                          | 163-180 | `const demoTemplates = [...]`               | Demo      | ❌ NO - SIMPLIFIED  |

**Example Inconsistency Found:**

In **TemplateRegistry.tsx** (Line 93):

```typescript
accent: "#4F46E5",  // "modern" template accent
```

In **Configurator.tsx** (Line 528):

```typescript
accent: "#2563EB",  // DIFFERENT! "modern" template accent
```

⚠️ **This creates a risk of visual inconsistencies between preview and final site.**

### 1.5 Theme Definitions

**Location:** `client/components/template/TemplateRegistry.tsx` (Lines 187-223)

```typescript
export const defaultTemplateThemes: Record<string, TemplateTheme> = {
  minimalist: {
    primary: "#2563EB",
    secondary: "#7C3AED",
    text: "#1A1A1A",
    background: "#FFFFFF",
    highlight: "#14B8A6",
    buttonRadius: "rounded-lg",
    buttonHover: "grow",
  },
  modern: {
    primary: "#4F46E5",
    secondary: "#7C3AED",
    text: "#FFFFFF",
    background: "#111827",
    highlight: "#22D3EE",
    buttonRadius: "rounded-xl",
    buttonHover: "glow",
  },
  stylish: {
    primary: "#059669",
    secondary: "#10B981",
    text: "#F9FAFB",
    background: "#111827",
    highlight: "#F59E0B",
    buttonRadius: "rounded-2xl",
    buttonHover: "grow",
  },
  cozy: {
    primary: "#EA580C",
    secondary: "#F59E0B",
    text: "#1F2937",
    background: "#FFFBF0",
    highlight: "#FDBA74",
    buttonRadius: "rounded-2xl",
    buttonHover: "grow",
  },
};
```

### 1.6 Summary: Data Layer

| Aspect                | Current State                                     | Problem                      |
| --------------------- | ------------------------------------------------- | ---------------------------- |
| **Type Definitions**  | Clear interfaces, well-typed                      | ✅ Good                      |
| **Templates Storage** | Hardcoded arrays in 4 files                       | ❌ Duplicated                |
| **Themes Storage**    | Record<string, TemplateTheme> in TemplateRegistry | ⚠️ Not synced with templates |
| **Configuration**     | Stores template ID as string                      | ✅ Correct approach          |
| **Type Safety**       | Template ID is `string` (no enum)                 | ❌ No compile-time checks    |
| **Scalability**       | Hard to add >10 templates                         | ❌ Not scalable              |

---

## 2. The Logic Layer: State Flow & Live Preview

### 2.1 Configurator State Initialization

**Location:** `client/pages/Configurator.tsx` (Lines 140-174)

```typescript
// Persistence system initialization
const [isEnabled] = useState(() => {
  try {
    return persistence.getEnabled ? persistence.getEnabled() : true;
  } catch {
    return true;
  }
});

// Current step restoration from localStorage
const [currentStep, setCurrentStep] = useState(() => {
  const restoredStep = persistence.getCurrentStep();
  console.log("Restored current step:", restoredStep);
  return restoredStep;
});

// FormData restoration from localStorage
const [formData, setFormData] = useState(() => {
  const restoredData = persistence.getFormData();
  console.log("Restored form data:", restoredData);
  return restoredData;
});

// Config ID and Published URL restoration
const [currentConfigId, setCurrentConfigId] = useState<string | null>(() => {
  return persistence.getConfigId() || null;
});

const [publishedUrl, setPublishedUrl] = useState<string | null>(() => {
  return persistence.getPublishedUrl() || null;
});
```

**Data Flow:**

1. Component mounts
2. `persistence.getFormData()` reads from localStorage
3. `formData` is initialized with previous state (including `formData.template`)
4. If no previous state, `getDefaultFormData()` provides empty defaults

### 2.2 Template Selection & Storage

**User Action Flow:**

```
User clicks template in TemplateRegistry UI
    ↓
TemplateRegistry.tsx: onClick={() => onTemplateSelect?.(template.id)}
    ↓
Configurator.tsx: updateFormData({ template: templateId })
    ↓
persistence.updateFormData({ template: "modern" })
    ↓
localStorage.setItem("configurator_persistence", JSON.stringify(state))
    ↓
Re-render triggered via setFormData()
    ↓
TemplatePreviewContent re-renders with new template
```

**Code Example (TemplateRegistry):**

Location: `client/components/template/TemplateRegistry.tsx` (Lines 250-253)

```typescript
<div
  key={template.id}
  className={`cursor-pointer transition-all duration-300 border-2 rounded-lg p-4 ${
    selectedTemplate === template.id
      ? "border-teal-500 bg-teal-50 shadow-lg"
      : "border-gray-200 hover:border-teal-300 hover:shadow-md"
  }`}
  onClick={() => onTemplateSelect?.(template.id)}  // ← Calls parent with ID only
>
```

### 2.3 Live Preview Data Flow

**Location:** `client/pages/Configurator.tsx` (Lines 1476-1760)

```typescript
const TemplatePreviewContent = () => {
  // Determine which template to display
  const selectedIdForSwitch = previewTemplateId || formData.template || "modern";

  // Find the full Template object from the templates array
  const selectedTemplateDef = templates.find(
    (t) => t.id === selectedIdForSwitch,
  );

  // Get the template's base style
  const baseTemplateStyle = selectedTemplateDef
    ? selectedTemplateDef.style
    : templates[0].style;

  // Use selectedTemplateDef.mockup for sections rendering
  // Pass formData and template together to child components

  return (
    <div style={{ background: baseTemplateStyle.background }}>
      {/* Render sections with both formData and template */}
      <GalleryGrid
        images={formData.gallery}
        templateStyle={selectedTemplateDef?.id}
      />
      <MenuSection
        items={formData.menuItems}
        templateStyle={selectedTemplateDef?.id}
        primaryColor={formData.primaryColor}
      />
    </div>
  );
};
```

**Critical Finding:**

- Template object is looked up **inside TemplatePreviewContent**
- Both `formData` AND `selectedTemplateDef` are passed to child components
- Preview updates via React's closure - if `formData` or `previewTemplateId` change, re-render happens automatically

### 2.4 Live Preview Reactivity

**How Changes Trigger Updates:**

1. **User changes template:**

   ```
   onClick in TemplateRegistry
   → updateFormData({ template: "modern" })
   → setFormData(newFormData)
   → Component re-renders
   → TemplatePreviewContent uses formData.template
   → selectedTemplateDef = templates.find(t => t.id === "modern")
   → Entire preview re-renders with new styles
   ```

2. **User changes colors:**

   ```
   onChange in color input
   → updateFormData({ primaryColor: "#FF0000" })
   → setFormData(newFormData)
   → TemplatePreviewContent re-renders
   → Child components receive new primaryColor prop
   → Inline styles update via props
   ```

3. **User uploads images:**
   ```
   onFileSelect in gallery uploader
   → updateFormData({ gallery: [...newImages] })
   → setFormData(newFormData)
   → GalleryGrid re-renders with new images
   ```

**No API calls are made during preview** - all changes are instant client-side React state updates.

### 2.5 Summary: Logic Layer

| Aspect                  | Current State                       | Assessment                  |
| ----------------------- | ----------------------------------- | --------------------------- |
| **State Management**    | localStorage + React useState       | ✅ Works well               |
| **Template ID Storage** | string in formData                  | ✅ Correct                  |
| **Live Preview**        | Looks up template object on render  | ⚠️ O(n) search every render |
| **Data Persistence**    | localStorage + server save          | ✅ Robust                   |
| **Reactivity**          | Instant via React closure           | ✅ Smooth                   |
| **Decoupling**          | formData depends on templates array | ❌ Tight coupling           |

---

## 3. The View Layer: Styling-Strategie

### 3.1 Component Styling Patterns

Components use **two parallel styling approaches:**

**Pattern A: Static Tailwind Classes from Mockup**

```typescript
// From template.mockup object
const navClasses = selectedTemplateDef.mockup.nav.bg;  // "bg-white/10 backdrop-blur-md"
return <nav className={navClasses}>...</nav>;
```

**Pattern B: Switch-Statement Based on Template ID**

```typescript
const getTemplateStyles = () => {
  switch (templateStyle) {
    case "minimalist":
      return { card: "py-2 border-b border-gray-200", ... };
    case "modern":
      return { card: "bg-white/20 backdrop-blur-md rounded-xl", ... };
    // ... more cases
  }
};
```

**Pattern C: Inline Styles from Props**

```typescript
style={{
  backgroundColor: primaryColor ? `${primaryColor}20` : undefined,
  color: textColor,
}}
```

### 3.2 GalleryGrid.tsx - Code Example

**Location:** `client/components/sections/GalleryGrid.tsx` (Lines 27-80)

```typescript
interface GalleryGridProps {
  images?: any[];
  onImageSelect?: (index: number, image: any) => void;
  onRemoveImage?: (index: number) => void;
  showRemoveButtons?: boolean;
  templateStyle?: string;      // ← Receives template ID
  className?: string;
  cols?: number;
}

const GalleryGrid = ({
  images = [],
  onImageSelect,
  onRemoveImage,
  showRemoveButtons = false,
  templateStyle = "minimalist",  // ← Default to minimalist
  className = "",
  cols = 2,
}: GalleryGridProps) => {
  // PATTERN: Switch-statement for template-specific styles
  const getTemplateStyles = () => {
    switch (templateStyle) {
      case "minimalist":
        return {
          container: `grid grid-cols-${cols} gap-2`,
          imageItem:
            "aspect-square bg-gray-100 rounded flex items-center justify-center overflow-hidden",
          placeholderIcon: "w-6 h-6 text-gray-400",
          placeholderText: "text-xs text-gray-500 mt-1",
          removeButton:
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500 hover:bg-red-600",
        };
      case "modern":
        return {
          container: `grid grid-cols-${cols} gap-3`,
          imageItem:
            "aspect-square bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/40 overflow-hidden group",
          placeholderIcon: "w-8 h-8 text-white/60",
          placeholderText: "text-xs text-white/60 mt-2",
          removeButton:
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500/80 backdrop-blur hover:bg-red-600/80",
        };
      case "stylish":
        return {
          container: `grid grid-cols-${cols} gap-3`,
          imageItem:
            "aspect-square bg-white/5 backdrop-blur rounded-lg flex items-center justify-center border border-white/10 overflow-hidden group",
          placeholderIcon: "w-8 h-8 text-emerald-400/60",
          placeholderText: "text-xs text-emerald-100/60 mt-2",
          removeButton:
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500/80 backdrop-blur hover:bg-red-600/80",
        };
      case "cozy":
        return {
          container: `grid grid-cols-${cols} gap-3`,
          imageItem:
            "aspect-square bg-slate-800/50 backdrop-blur rounded flex items-center justify-center border border-amber-500/30 overflow-hidden group",
          placeholderIcon: "w-8 h-8 text-amber-400/60",
          placeholderText: "text-xs text-amber-200/60 mt-2",
          removeButton:
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500/80 backdrop-blur hover:bg-red-600/80",
        };
      default:
        return {
          container: `grid grid-cols-${cols} gap-2`,
          imageItem:
            "aspect-square bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden group",
          placeholderIcon: "w-6 h-6 text-gray-400",
          placeholderText: "text-xs text-gray-500 mt-1",
          removeButton:
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500 hover:bg-red-600",
        };
    }
  };

  const styles = getTemplateStyles();

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Images and placeholders rendered with styles */}
    </div>
  );
};
```

**Analysis:**

- Each template gets **dedicated CSS classes** hardcoded in the switch statement
- All 4 templates return different class sets
- Problem: Adding a 5th template requires editing this component

### 3.3 MenuSection.tsx - Code Example

**Location:** `client/components/sections/MenuSection.tsx` (Lines 53-133)

```typescript
interface MenuSectionProps {
  items?: any[];
  onAddToCart?: (item: any, qty: number) => void;
  onRemoveItem?: (itemId: string) => void;
  showOrderingButtons?: boolean;
  showRemoveButtons?: boolean;
  className?: string;
  templateStyle?: string;     // ← Receives template ID
  primaryColor?: string;      // ← Dynamic color
  secondaryColor?: string;    // ← Dynamic color
  textColor?: string;         // ← Dynamic color
  socialProofStats?: Record<string, number>;
  showSocialProof?: boolean;
}

const MenuSection = ({
  items = [],
  templateStyle = "minimalist",
  primaryColor,
  secondaryColor,
  textColor,
}: MenuSectionProps) => {
  // PATTERN: Switch-statement for template-specific styles
  const getTemplateStyles = () => {
    switch (templateStyle) {
      case "minimalist":
        return {
          container: "space-y-0",
          itemCard: "py-2 border-b border-gray-200 last:border-b-0",
          itemName: "font-medium text-sm text-black",
          itemDesc: "text-xs text-gray-600",
          itemPrice: "font-medium text-sm text-black",
          emoji: "hidden",
        };
      case "modern":
        return {
          container: "space-y-3",
          itemCard:
            "bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/40 shadow-xl",
          itemName: "font-bold text-sm text-white drop-shadow-md",
          itemDesc: "text-xs text-white drop-shadow-sm",
          itemPrice: "font-bold text-sm text-white drop-shadow-md",
          emoji: "hidden",
        };
      case "stylish":
        return {
          container: "space-y-3",
          itemCard:
            "bg-white/5 backdrop-blur rounded p-3 border border-white/10",
          itemName: "font-serif font-semibold text-sm text-emerald-100",
          itemDesc: "text-xs text-emerald-200/80",
          itemPrice: "font-serif font-semibold text-sm text-emerald-400",
          emoji: "hidden",
        };
      case "cozy":
        return {
          container: "space-y-3",
          itemCard: "backdrop-blur rounded border p-3",  // ← Neutral, colors via inline styles
          itemName: "font-serif font-bold text-sm",
          itemDesc: "text-xs",
          itemPrice: "font-serif font-bold text-sm",
          emoji: "hidden",
        };
      default:
        return {
          container: "space-y-3",
          itemCard: "bg-white/90 backdrop-blur rounded-lg p-3 shadow-sm",
          itemName: "font-semibold text-sm",
          itemDesc: "text-xs text-gray-600",
          itemPrice: "font-bold text-sm",
          emoji: "hidden",
        };
    }
  };

  const styles = getTemplateStyles();

  // PATTERN C: Inline styles for dynamic colors
  return (
    <div className={`${styles.container} ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          className={styles.itemCard}
          style={
            templateStyle === "cozy"
              ? {
                  backgroundColor: secondaryColor
                    ? `${secondaryColor}20`
                    : undefined,
                  borderColor: primaryColor,
                }
              : undefined
          }
        >
          {/* Item content */}
        </div>
      ))}
    </div>
  );
};
```

**Key Insight:**

- MenuSection also uses switch-statement (8 cases total for 4 templates)
- Cozy template uses **inline styles** for colors (only one that does)
- Modern and Stylish have hardcoded text colors
- Pattern: Static Tailwind + optional inline color overrides

### 3.4 Mockup Object Usage

**What is Mockup?**

```typescript
mockup: {
  nav: {
    bg: "bg-white/10 backdrop-blur-md",      // ← Tailwind classes as string
    text: "text-white",
    border: "border-white/20",
  },
  hero: {
    bg: "bg-gradient-to-r from-blue-500 to-purple-600",
    text: "text-white",
  },
  cards: {
    bg: "bg-white/15 backdrop-blur-sm",
    border: "border-white/30",
    text: "text-white",
  },
}
```

**How It's Used:**

The mockup object contains **pre-composed Tailwind class strings** that are meant to be used directly in components. However, in the current codebase, the mockup is **not extensively used** - instead, components define their own switch-statements.

**Potential Future Use:**

```typescript
// Future approach (more scalable):
const navClasses = selectedTemplateDef?.mockup.nav.bg || "bg-white";
return <nav className={navClasses}>...</nav>;

// Instead of:
switch (templateStyle) {
  case "modern":
    return { nav: "bg-white/10 backdrop-blur-md" };
  case "stylish":
    return { nav: "bg-slate-900/80 backdrop-blur" };
  // ... etc
}
```

### 3.5 Summary: View Layer

| Aspect                            | Current State                            | Problem                   |
| --------------------------------- | ---------------------------------------- | ------------------------- |
| **Styling Approach**              | Mix of switch statements + Tailwind      | ⚠️ Not unified            |
| **Dynamic Colors**                | Props passed to components               | ✅ Works                  |
| **Template-specific Classes**     | Hardcoded in switch statements           | ❌ High duplication       |
| **Mockup Usage**                  | Defined but not leveraged                | ⚠️ Wasted potential       |
| **Component Count with Switches** | 2+ components (GalleryGrid, MenuSection) | ❌ Growth issue           |
| **Type Safety**                   | templateStyle is `string`                | ❌ No compile-time checks |

---

## 4. Tech Debt: Identifizierte Probleme

### 4.1 Code Duplication

**Template Array Duplication:**

| File                 | Duplication                     | Impact               |
| -------------------- | ------------------------------- | -------------------- |
| TemplateRegistry.tsx | `export const defaultTemplates` | Source               |
| Configurator.tsx     | `const templates = [...]`       | Manual sync required |
| Site.tsx             | `const templates = [...]`       | Manual sync required |
| Index.tsx            | `const demoTemplates = [...]`   | Simplified version   |

**When TemplateRegistry.tsx is updated, developers must:**

1. ✅ Update 1 place (TemplateRegistry.tsx)
2. ❌ Manually update Configurator.tsx
3. ❌ Manually update Site.tsx
4. ❌ Update Index.tsx if needed

**No TypeScript errors if sync is missed** - will only cause runtime inconsistencies.

**getTemplateStyles() Duplication:**

Every component that needs template-specific styling (GalleryGrid, MenuSection, etc.) redefines the same switch-statement:

```typescript
// GalleryGrid.tsx - 4 case statements (minimalist, modern, stylish, cozy)
const getTemplateStyles = () => {
  switch (templateStyle) {
    case "minimalist": return { ... };
    case "modern": return { ... };
    // ...
  }
};

// MenuSection.tsx - 4 case statements (exact same logic)
const getTemplateStyles = () => {
  switch (templateStyle) {
    case "minimalist": return { ... };
    case "modern": return { ... };
    // ...
  }
};

// HeroSection.tsx, FooterSection.tsx, etc. - repeat again
```

**Impact:** If adding a new template, need to update 5+ components.

### 4.2 Hardcoded Values

**Template IDs:**

```typescript
// Hardcoded in switch statements across codebase
case "minimalist":
case "modern":
case "stylish":
case "cozy":
// Add new template = update all switch statements
```

**Tailwind Classes:**

```typescript
// Hardcoded in mockup and switch statements
bg: "bg-white/10 backdrop-blur-md";
border: "border-white/20";
// No way to change these without code changes
```

**Layout Semantics:**

```typescript
// In template.style.layout
layout: "narrative-fullscreen";
layout: "modern-cards";
layout: "visual-overlap";
layout: "cozy-grid";
// These strings drive conditional rendering somewhere
```

**Business Types:**

```typescript
// Same for all templates
businessTypes: ["cafe", "restaurant", "bar"];
// Cannot add "hotel" or "gym" without code changes
```

**Feature Strings:**

```typescript
features: ["Ultra Clean", "Fast Loading", "Content Focus"];
// Not translated, not dynamic, not a separate registry
```

### 4.3 Scaling Problems

**Scenario: Adding 10 Templates**

**Current Approach:**

1. Add 10 objects to TemplateRegistry.tsx (10-15 KB code)
2. Add 10 duplicate objects to Configurator.tsx
3. Add 10 duplicate objects to Site.tsx
4. For each of 10 templates, add 10 case statements to:
   - GalleryGrid.tsx (10 new cases, ~30 lines each = 300 lines)
   - MenuSection.tsx (10 new cases = 300 lines)
   - HeroSection.tsx (10 new cases = 300 lines)
   - FooterSection.tsx (10 new cases = 300 lines)
   - Any other sections (×5 more = 1500+ lines)

**Total Impact:** 2000-3000 lines of code added, mostly duplication, error-prone

**Problem Cascade:**

- Larger JavaScript bundle size
- Slower component renders (O(n) switch statements)
- Higher maintenance burden
- More testing required
- Risk of inconsistency increases

### 4.4 Maintenance & Type Safety Issues

**No Type Safety for Template IDs:**

```typescript
// This compiles fine:
const template: string = "modernnn"; // Typo, but no error!
// Only discovered at runtime when templates.find() returns undefined
```

**Proposed Solution:**

```typescript
// Future approach:
type TemplateId = "minimalist" | "modern" | "stylish" | "cozy";
const template: TemplateId = "modernnn"; // ✅ Compile error caught
```

**Inconsistent Data Formats:**

- TemplateRegistry.tsx: Template object with nested mockup
- Configurator.tsx: Template object (slightly different properties)
- Site.tsx: Template object (again, different)
- API: Configuration with only template ID string
- localStorage: Entire formData object

**No Validation Layer:**

- What if someone manually edits localStorage and sets `template: "xyz"`?
- Site.tsx calls `templates.find(t => t.id === formData.template)` - returns undefined
- Renders with `templates[0]` as fallback (silent error)

### 4.5 Performance Implications

**Bundle Size:**

- All 4 template objects are bundled in the JavaScript
- Users who only need "modern" still load definitions for "minimalist", "stylish", "cozy"
- Uncompressed: ~5-8 KB per template definition
- With 10 templates: 50-80 KB of unused code

**Runtime Performance:**

```typescript
// Every render of a component with template styles:
const selectedTemplateDef = templates.find((t) => t.id === selectedIdForSwitch);
// O(n) linear search, happens on every render
// With 50 templates, this becomes noticeable
```

**Browser Parsing:**

- More JavaScript = longer parse time
- Especially problematic on low-end devices / slow networks

### 4.6 Summary: Tech Debt Overview

```
┌─────────────────────────────────────────────────────────────┐
│ CRITICAL ISSUES                                             │
├─────────────────────────────────────────────────────────────┤
│ 1. Template duplication in 3+ files (sync risk)             │
│ 2. getTemplateStyles() duplicated in 5+ components          │
│ 3. Hardcoded template IDs in switch statements              │
│ 4. All templates bundled (no lazy-loading)                  │
│ 5. No type safety for template IDs                          │
│                                                              │
│ SCALING ISSUES (5-10 templates = manageable)                │
│ UNMAINTAINABLE (50+ templates = impossible)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Source of Truth & Refactoring Roadmap

### 5.1 Current Source of Truth

**Primary Source (Canonical):**

- **`client/components/template/TemplateRegistry.tsx`** (Lines 51-223)
- Exports: `defaultTemplates`, `defaultTemplateThemes`
- Also exports: Template, TemplateTheme, TemplateStyle, TemplateMockup interfaces
- This is the only place where templates are "officially" defined

**Secondary Sources (Replicas - Out of Sync Risk):**

- `client/pages/Configurator.tsx` (Lines 487-620): Duplicate `templates` array
- `client/pages/Site.tsx` (Lines 38-160): Duplicate `templates` array
- `client/pages/Index.tsx` (Lines 163-180): Simplified `demoTemplates` array

**Why This is Problematic:**

When TemplateRegistry.tsx is updated, there's no enforcement mechanism to update the other files. Changes can easily be missed, leading to:

- Visual inconsistencies between preview and published site
- Confusion about which template definition to trust
- Silent errors (no type checking, no compile errors)

### 5.2 Identified Synchronization Issues

**Example #1: Modern Template Accent Color Mismatch**

In `TemplateRegistry.tsx` (Line 93):

```typescript
{
  id: "modern",
  // ...
  style: {
    accent: "#4F46E5",  // Purple accent
    // ...
  }
}
```

In `Configurator.tsx` (Line 528):

```typescript
{
  id: "modern",
  // ...
  style: {
    accent: "#2563EB",  // Blue accent (DIFFERENT!)
    // ...
  }
}
```

**Result:** The live preview in Configurator shows blue accent, but the published site shows purple accent.

**Example #2: Modern Template Gradient**

In `TemplateRegistry.tsx` (Line 76):

```typescript
background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
```

In `Configurator.tsx` (Line 526-527):

```typescript
background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 50%, #1e40af 100%)";
```

**Result:** Different gradient = different visual result between preview and published.

**Root Cause:** No automated sync mechanism, relies on manual developer discipline.

### 5.3 Roadmap: Refactoring to Theme Store Architecture

This roadmap outlines a phased approach to move from hardcoded objects to a centralized, JSON-based Theme Store.

#### **Phase 1: Consolidation (Immediate - 1-2 hours)**

Goal: Single source of truth without changing how templates are loaded

**Steps:**

1. Keep `TemplateRegistry.tsx` as the canonical source
2. Update `Configurator.tsx` to import from TemplateRegistry:
   ```typescript
   import { defaultTemplates } from "@/components/template/TemplateRegistry";
   // Remove local const templates = [...] declaration
   ```
3. Update `Site.tsx` to import from TemplateRegistry
4. Update `Index.tsx` to import from TemplateRegistry
5. Add a test: Verify all files reference the same object

**Benefit:** Eliminates duplication, ensures sync, minimal code changes

**Risk:** None - import is compatible with existing code

#### **Phase 2: JSON Externalization (1 day)**

Goal: Move template definitions from TypeScript to JSON file

**Steps:**

1. Create `data/templates.json`:

   ```json
   {
     "templates": [
       {
         "id": "minimalist",
         "name": "Minimalist",
         "description": "...",
         "preview": "bg-gradient-to-br from-white to-gray-100",
         "businessTypes": ["cafe", "restaurant", "bar"],
         "style": { ... },
         "features": [...],
         "mockup": { ... }
       },
       // ... 3 more
     ],
     "themes": {
       "minimalist": { ... },
       "modern": { ... },
       "stylish": { ... },
       "cozy": { ... }
     }
   }
   ```

2. Create `client/lib/templates.ts`:

   ```typescript
   import templatesData from "../../data/templates.json";
   export const defaultTemplates = templatesData.templates;
   export const defaultTemplateThemes = templatesData.themes;
   ```

3. Update TemplateRegistry.tsx to import from templates.ts instead of defining locally

4. Update all other files to import from templates.ts

**Benefit:** Separates data from code, easier to version control, easier to edit

**Risk:** Minimal - Zod validation can ensure JSON matches TypeScript interface

#### **Phase 3: Zod Validation & Runtime Type Safety (2-3 hours)**

Goal: Validate template data at build time and runtime

**Steps:**

1. Create `client/lib/templates.schema.ts`:

   ```typescript
   import { z } from "zod";

   export const TemplateStyleSchema = z.object({
     background: z.string(),
     accent: z.string(),
     text: z.string(),
     // ... etc
   });

   export const TemplateSchema = z.object({
     id: z.string().min(1),
     name: z.string().min(1),
     description: z.string(),
     // ... etc
   });

   export const TemplatesDataSchema = z.object({
     templates: z.array(TemplateSchema),
     themes: z.record(z.string(), z.object({ ... })),
   });
   ```

2. Validate on load:

   ```typescript
   const validated = TemplatesDataSchema.parse(templatesData);
   ```

3. Create TypeScript type from Zod schema:
   ```typescript
   export type Template = z.infer<typeof TemplateSchema>;
   ```

**Benefit:** Compile-time + runtime validation, no orphaned template IDs, safe refactoring

**Risk:** None - validation only adds safety

#### **Phase 4: Dynamic Theme Store & Admin UI (1-2 days)**

Goal: Load templates from server, enable runtime management

**Steps:**

1. Create API endpoint: `GET /api/templates`

   ```typescript
   app.get("/api/templates", (req, res) => {
     res.json({
       templates: [...],
       themes: {...}
     });
   });
   ```

2. Create client-side theme store with caching:

   ```typescript
   const useTemplateStore = create((set) => ({
     templates: [],
     themes: {},
     loadTemplates: async () => {
       const res = await fetch("/api/templates");
       const data = await res.json();
       set({ templates: data.templates, themes: data.themes });
     },
   }));
   ```

3. Load templates at app startup:

   ```typescript
   useEffect(() => {
     useTemplateStore.getState().loadTemplates();
   }, []);
   ```

4. (Optional) Create admin UI to manage templates CRUD

**Benefit:** Templates can be updated without deploying code, versioning, A/B testing

**Risk:** Network dependency - need fallback to bundled templates

### 5.4 Expected Outcomes

After implementing this roadmap:

**After Phase 1:**

- ✅ Single source of truth
- ✅ No duplication
- ✅ Guaranteed sync

**After Phase 2:**

- ✅ Data separated from code
- ✅ Templates easier to edit (JSON)
- ✅ Smaller TypeScript bundles

**After Phase 3:**

- ✅ Type-safe template IDs (via type aliases)
- ✅ Runtime validation prevents bad data
- ✅ Refactoring safe (renames checked at compile time)

**After Phase 4:**

- ✅ Dynamic template management
- ✅ No deploy needed for new templates
- ✅ A/B testing & feature flags possible

### 5.5 Short-Term Recommendations

**Priority 1 (This week):**

- [ ] Implement Phase 1 (consolidation)
- [ ] Add test to verify template sync across files
- [ ] Document which file is source of truth

**Priority 2 (Next week):**

- [ ] Create `data/templates.json`
- [ ] Move template objects to JSON
- [ ] Keep TypeScript interfaces for type safety

**Priority 3 (Next sprint):**

- [ ] Add Zod validation
- [ ] Create TypeScript union type for template IDs
- [ ] Update switch statements to use typeof checks

**Priority 4 (Future):**

- [ ] Create API endpoint for templates
- [ ] Add admin UI for template management
- [ ] Implement server-side caching

---

## Appendix: File References

### Key Files Analyzed

| File                                              | Purpose                         | Lines   | Type             |
| ------------------------------------------------- | ------------------------------- | ------- | ---------------- |
| `client/components/template/TemplateRegistry.tsx` | Template definitions & UI       | 1-284   | Component + Data |
| `client/pages/Configurator.tsx`                   | Main configurator UI            | 1-9700+ | Page Component   |
| `client/pages/Site.tsx`                           | Site rendering                  | 1-500+  | Page Component   |
| `client/lib/api.ts`                               | API client & Configuration type | 1-200+  | Utilities        |
| `client/lib/stepPersistence.ts`                   | State persistence               | 1-300+  | Service          |
| `client/components/sections/GalleryGrid.tsx`      | Gallery section component       | 1-150+  | Component        |
| `client/components/sections/MenuSection.tsx`      | Menu section component          | 1-300+  | Component        |
| `client/pages/Index.tsx`                          | Home page with demo             | 1-300+  | Page             |

### Key Sections by File

#### TemplateRegistry.tsx

- **Lines 3-50:** Interface definitions (TemplateStyle, TemplateMockup, Template, TemplateTheme)
- **Lines 51-185:** defaultTemplates array with 4 template objects
- **Lines 187-223:** defaultTemplateThemes mapping
- **Lines 225-284:** TemplateRegistry React component

#### Configurator.tsx

- **Lines 2-70:** Imports
- **Lines 140-174:** State initialization (formData, currentStep, configId)
- **Lines 270-273:** Preview template state
- **Lines 487-620:** Local templates array (DUPLICATE)
- **Lines 1476-1760:** TemplatePreviewContent component
- **Lines 4455+:** Template selection step

#### Site.tsx

- **Lines 32-36:** Font options
- **Lines 38-160:** Local templates array (DUPLICATE)
- **Lines 200+:** SiteRenderer component and rendering logic

#### API.ts

- **Lines 5-42:** Configuration interface with template field
- **Lines 52-60:** User ID utilities
- **Lines 63-150:** API request and configuration methods

#### StepPersistence.ts

- **Lines 6-28:** StepData and PersistenceState interfaces
- **Lines 36-150:** StepPersistence class
- **Lines 72-96:** Default form data structure

#### GalleryGrid.tsx

- **Lines 1-26:** Props interface and default values
- **Lines 27-80:** getTemplateStyles() switch statement
- **Lines 82+:** Rendering logic

#### MenuSection.tsx

- **Lines 1-52:** Props interface
- **Lines 53-104:** getTemplateStyles() switch statement
- **Lines 105-300+:** Rendering logic with inline styles

---

## Conclusion

### Current State Assessment

✅ **Functional for 4 templates**
✅ **Live preview works smoothly**
✅ **State persistence is robust**
❌ **Not scalable beyond 10 templates**
❌ **High duplication risk**
❌ **Difficult to maintain**

### Next Steps

1. **Immediate:** Implement Phase 1 (consolidation) to eliminate duplication
2. **Short-term:** Move to JSON-based template store (Phase 2)
3. **Medium-term:** Add validation and type safety (Phase 3)
4. **Long-term:** Enable dynamic theme management (Phase 4)

This architecture document serves as the foundation for a planned refactoring toward a more maintainable, scalable Theme Store system.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-13  
**Author:** Architecture Analysis  
**Status:** Complete & Ready for Refactoring
