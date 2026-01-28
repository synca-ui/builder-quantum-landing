/**
 * Shared CategoryFilter Component
 *
 * Horizontale Scroll-Leiste für Menü-Kategorien
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo, useRef, useEffect } from 'react';

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
  allLabel = 'Alle',
  maxVisible = 5,
  isPreview = false,
  className = '',
}: CategoryFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll zur aktiven Kategorie wenn sie sich ändert
  useEffect(() => {
    if (scrollContainerRef.current && activeCategory) {
      const activeButton = scrollContainerRef.current.querySelector(`[data-category="${activeCategory}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
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

  // Kategorien limitieren
  const visibleCategories = categories.slice(0, maxVisible);

  return (
    <div
      ref={scrollContainerRef}
      className={`flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2 ${className}`}
      role="tablist"
      aria-label="Kategorien filtern"
      style={{
        // Smooth scroll
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        // Hide scrollbar
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {/* "Alle" Button */}
      <button
        onClick={() => handleCategoryClick(null)}
        className={`px-4 py-2 text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 shrink-0`}
        style={{
          backgroundColor: activeCategory === null ? fontColor : 'transparent',
          color: activeCategory === null ? backgroundColor : fontColor,
          borderRadius: 'var(--radius-button, 9999px)',
          border: activeCategory === null ? 'none' : `1px solid ${fontColor}20`,
          boxShadow: activeCategory === null ? 'var(--shadow-button, 0 2px 8px rgba(0,0,0,0.1))' : 'none',
          opacity: activeCategory === null ? 1 : 0.7,
        }}
        role="tab"
        aria-selected={activeCategory === null}
        data-category="all"
      >
        {allLabel}
      </button>

      {/* Kategorie Buttons */}
      {visibleCategories.map((category) => {
        const isActive = activeCategory === category;

        return (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 shrink-0`}
            style={{
              backgroundColor: isActive ? fontColor : 'transparent',
              color: isActive ? backgroundColor : fontColor,
              borderRadius: 'var(--radius-button, 9999px)',
              border: isActive ? 'none' : `1px solid ${fontColor}20`,
              boxShadow: isActive ? 'var(--shadow-button, 0 2px 8px rgba(0,0,0,0.1))' : 'none',
              opacity: isActive ? 1 : 0.7,
            }}
            role="tab"
            aria-selected={isActive}
            data-category={category}
          >
            {category}
          </button>
        );
      })}

      {/* "Mehr" Indikator wenn abgeschnitten */}
      {categories.length > maxVisible && (
        <div
          className="px-2 py-2 text-xs opacity-50 whitespace-nowrap shrink-0 flex items-center"
          style={{ color: fontColor }}
        >
          +{categories.length - maxVisible} mehr
        </div>
      )}
    </div>
  );
});

export default CategoryFilter;

