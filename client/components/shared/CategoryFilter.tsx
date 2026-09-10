/**
 * Shared CategoryFilter Component
 *
 * Horizontale Scroll-Leiste für Menü-Kategorien
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 *
 * Templates mit eigenem Layout (templateLayout.ts) bekommen statt der
 * Pillen Reiter mit Unterstrich (presse, morgen) oder eckige Marken
 * (kiosk, izakaya). Der Bestand behält seine Pillen („chips“); die Liste der
 * Kategorien kommt jetzt in beiden Renderern aus kategorienReihenfolge.
 */

import React, { memo, useRef, useEffect, useState } from "react";
import { getTemplateLayout } from "@/lib/templateLayout";

// ============================================
// TYPES
// ============================================

export interface CategoryFilterProps {
  /** Verfügbare Kategorien */
  categories: string[];
  /** Aktuell ausgewählte Kategorie (null = alle) */
  activeCategory: string | null;
  /** Callback bei Kategorie-Wechsel */
  onCategoryChange: (category: string | null) => void;
  /** Schriftfarbe */
  fontColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Akzentfarbe aktiver Reiter (Templates mit eigenem Layout) */
  accentColor?: string;
  /** Template-ID für Layout-Varianten */
  template?: string;
  /** Label für "Alle" Button */
  allLabel?: string;
  /** Maximale Anzahl sichtbarer Kategorien */
  maxVisible?: number;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const CategoryFilter = memo(function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
  fontColor,
  backgroundColor,
  accentColor,
  template,
  allLabel = "Alle",
  maxVisible = 5,
  isPreview = false,
  className = "",
}: CategoryFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  /**
   * Sind auch die abgeschnittenen Kategorien sichtbar?
   *
   * Vorher war "+6 mehr" ein <div> ohne onClick — die sechs Kategorien
   * dahinter waren damit überhaupt nicht erreichbar. Bei einer automatisch
   * erkannten Karte ist das kein Randfall: Der Messkorpus hat Karten mit 14
   * und 19 Kategorien, von denen dann fünf sichtbar waren.
   */
  const [expanded, setExpanded] = useState(false);

  /**
   * Steht die gewählte Kategorie im abgeschnittenen Teil, muss aufgeklappt
   * werden — sonst ist gefiltert, aber nicht erkennbar wonach.
   */
  const activeIndex = activeCategory ? categories.indexOf(activeCategory) : -1;
  useEffect(() => {
    if (activeIndex >= maxVisible) setExpanded(true);
  }, [activeIndex, maxVisible]);

  // Scroll zur aktiven Kategorie wenn sie sich ändert
  useEffect(() => {
    if (scrollContainerRef.current && activeCategory) {
      const activeButton = scrollContainerRef.current.querySelector(
        `[data-category="${activeCategory}"]`,
      );
      if (activeButton) {
        activeButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeCategory]);

  const handleCategoryClick = (category: string | null) => {
    onCategoryChange(category);
  };

  // Keine Kategorien vorhanden
  if (categories.length === 0) {
    return null;
  }

  // Kategorien limitieren, solange nicht aufgeklappt
  const visibleCategories = expanded
    ? categories
    : categories.slice(0, maxVisible);
  const versteckt = categories.length - maxVisible;

  const layout = getTemplateLayout(template);
  const variante = layout.filter;
  const akzent = accentColor || fontColor;

  /**
   * Klasse und Style eines Reiters. `gestrichelt` gilt für den Auf-/Zuklapp-
   * Knopf. Die Pillen (Bestand) sind Zeichen für Zeichen die bisherigen.
   */
  const reiter = (
    aktiv: boolean,
    gestrichelt = false,
  ): { className: string; style: React.CSSProperties } => {
    if (variante === "tabs") {
      return {
        className:
          "px-1 py-2 text-[11px] uppercase tracking-[0.16em] font-semibold whitespace-nowrap cursor-pointer shrink-0 transition-opacity hover:opacity-100",
        style: {
          color: aktiv ? akzent : fontColor,
          opacity: aktiv ? 1 : 0.6,
          borderBottom: aktiv ? `2px solid ${akzent}` : "2px solid transparent",
          borderStyle: gestrichelt ? "none none dashed none" : undefined,
          borderRadius: 0,
          marginBottom: "-1px",
        },
      };
    }
    if (variante === "eckig") {
      const staerke = layout.linie === "kraeftig" ? "1.5px" : "1px";
      return {
        className:
          "px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] font-bold whitespace-nowrap cursor-pointer shrink-0 transition-colors",
        style: {
          backgroundColor: aktiv ? fontColor : "transparent",
          color: aktiv ? backgroundColor : fontColor,
          border: `${staerke} ${gestrichelt ? "dashed" : "solid"} ${fontColor}`,
          borderRadius: 0,
          opacity: gestrichelt ? 0.8 : 1,
        },
      };
    }
    // chips (Bestand)
    if (gestrichelt) {
      return {
        className:
          "px-4 py-2 text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 shrink-0",
        style: {
          backgroundColor: "transparent",
          color: fontColor,
          borderRadius: "var(--radius-button, 9999px)",
          border: `1px dashed ${fontColor}40`,
          opacity: 0.8,
        },
      };
    }
    return {
      className:
        "px-4 py-2 text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 shrink-0",
      style: {
        backgroundColor: aktiv ? fontColor : "transparent",
        color: aktiv ? backgroundColor : fontColor,
        borderRadius: "var(--radius-button, 9999px)",
        border: aktiv ? "none" : `1px solid ${fontColor}20`,
        boxShadow: aktiv
          ? "var(--shadow-button, 0 2px 8px rgba(0,0,0,0.1))"
          : "none",
        opacity: aktiv ? 1 : 0.7,
      },
    };
  };

  const containerKlasse =
    variante === "tabs"
      ? "flex gap-4 overflow-x-auto no-scrollbar -mx-2 px-2"
      : "flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2";
  const containerStyle: React.CSSProperties =
    variante === "tabs" ? { borderBottom: `1px solid ${fontColor}26` } : {};

  const alle = reiter(activeCategory === null);

  return (
    <div
      ref={scrollContainerRef}
      className={`${containerKlasse} ${className}`}
      role="tablist"
      aria-label="Kategorien filtern"
      data-filter-variant={variante}
      style={{
        ...containerStyle,
        // Smooth scroll
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
        // Hide scrollbar
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}
    >
      {/* "Alle" Button */}
      <button
        onClick={() => handleCategoryClick(null)}
        className={alle.className}
        style={alle.style}
        role="tab"
        aria-selected={activeCategory === null}
        data-category="all"
      >
        {allLabel}
      </button>

      {/* Kategorie Buttons */}
      {visibleCategories.map((category) => {
        const isActive = activeCategory === category;
        const r = reiter(isActive);

        return (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className={r.className}
            style={r.style}
            role="tab"
            aria-selected={isActive}
            data-category={category}
          >
            {category}
          </button>
        );
      })}

      {/*
        Auf-/Zuklappen. Muss ein <button> sein: Als <div> war es ein toter
        Hinweis, und die Kategorien dahinter blieben unerreichbar.
      */}
      {versteckt > 0 &&
        (() => {
          const r = reiter(false, true);
          return (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={r.className}
              style={r.style}
              aria-expanded={expanded}
            >
              {expanded ? "weniger" : `+${versteckt} mehr`}
            </button>
          );
        })()}
    </div>
  );
});

export default CategoryFilter;
