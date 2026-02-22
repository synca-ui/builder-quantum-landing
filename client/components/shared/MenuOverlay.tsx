/**
 * Shared MenuOverlay Component
 *
 * Mobile Slide-Out Menü für Navigation
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo } from "react";
import { ChevronRight } from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface MenuOverlayProps {
  /** Ist das Overlay sichtbar? */
  isOpen: boolean;
  /** Hintergrundfarbe des Panels */
  backgroundColor: string;
  /** Schriftfarbe */
  fontColor: string;
  /** Menü-Einträge */
  menuItems: Array<{ id: string; label: string }>;
  /** Schließen-Handler */
  onClose: () => void;
  /** Navigation zu einer Seite */
  onNavigate: (pageId: string) => void;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Titel des Menüs */
  menuTitle?: string;
}

// ============================================
// COMPONENT
// ============================================

export const MenuOverlay = memo(function MenuOverlay({
  isOpen,
  backgroundColor,
  fontColor,
  menuItems,
  onClose,
  onNavigate,
  isPreview = false,
  menuTitle = "Menü",
}: MenuOverlayProps) {
  if (!isOpen) return null;

  const handleNavigate = (pageId: string) => {
    onNavigate(pageId);
    // Im Preview-Modus schließen wir das Menü auch
    onClose();
  };

  const handleBackdropClick = () => {
    onClose();
  };

  const handlePanelClick = (e: React.MouseEvent) => {
    // Verhindere, dass Klicks im Panel das Overlay schließen
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menü"
    >
      {/* Slide-Out Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-3/4 max-w-[300px] p-6 pt-20 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right"
        style={{
          backgroundColor,
          color: fontColor,
          boxShadow: "var(--shadow-modal, -10px 0 40px rgba(0,0,0,0.2))",
        }}
        onClick={handlePanelClick}
      >
        {/* Header */}
        <h3
          className="font-bold text-2xl mb-8 opacity-90"
          style={{ color: fontColor }}
        >
          {menuTitle}
        </h3>

        {/* Menu Items */}
        <nav className="space-y-4 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className="w-full text-left text-lg font-medium cursor-pointer flex justify-between items-center group pb-3 border-b transition-colors hover:opacity-80"
              style={{
                color: fontColor,
                borderColor: `${fontColor}10`,
              }}
              onClick={() => handleNavigate(item.id)}
            >
              <span>{item.label}</span>
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </nav>

        {/* Footer (optional) */}
        <div
          className="mt-auto pt-6 border-t text-sm opacity-60"
          style={{ borderColor: `${fontColor}10` }}
        >
          {isPreview ? (
            <span>Preview-Modus</span>
          ) : (
            <span>© {new Date().getFullYear()}</span>
          )}
        </div>
      </div>
    </div>
  );
});

export default MenuOverlay;
