/**
 * Shared OpeningHours Component
 *
 * Zeigt Öffnungszeiten an:
 * - Kompakt: "Heute: 09:00 - 22:00" mit Expand-Toggle
 * - Erweitert: Vollständige Wochenübersicht
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo, useState, useMemo } from 'react';
import { Clock, ChevronDown, MapPin } from 'lucide-react';
import type { OpeningHours as OpeningHoursType } from '@/types/domain';

// ============================================
// TYPES
// ============================================

export interface OpeningHoursProps {
  /** Öffnungszeiten-Daten */
  hours: OpeningHoursType;
  /** Standort/Adresse (optional) */
  location?: string;
  /** Schriftfarbe */
  fontColor: string;
  /** Initialer Expand-Status */
  initialExpanded?: boolean;
  /** Expand-Status von außen steuern */
  expanded?: boolean;
  /** Callback wenn Expand-Status sich ändert */
  onExpandChange?: (expanded: boolean) => void;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Kompakter Modus (nur heute) */
  compact?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ============================================
// HELPERS
// ============================================

const DAY_NAMES: Record<string, string> = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Gibt den aktuellen Wochentag zurück (englisch, lowercase)
 */
function getCurrentDay(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

/**
 * Formatiert die Öffnungszeiten für einen Tag
 */
function formatDayHours(day: { open: string; close: string; closed: boolean } | undefined): string {
  if (!day) return 'Keine Angabe';
  if (day.closed) return 'Geschlossen';
  return `${day.open} - ${day.close}`;
}

/**
 * Prüft ob aktuell geöffnet ist
 */
function isCurrentlyOpen(hours: OpeningHoursType): boolean {
  const today = getCurrentDay();
  const todayHours = hours[today];

  if (!todayHours || todayHours.closed) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

// ============================================
// COMPONENT
// ============================================

export const OpeningHours = memo(function OpeningHours({
  hours,
  location,
  fontColor,
  initialExpanded = false,
  expanded: controlledExpanded,
  onExpandChange,
  isPreview = false,
  compact = false,
  className = '',
}: OpeningHoursProps) {
  // Interner State wenn nicht von außen gesteuert
  const [internalExpanded, setInternalExpanded] = useState(initialExpanded);

  // Kontrolliert oder unkontrolliert
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const toggleExpanded = () => {
    const newValue = !isExpanded;
    if (controlledExpanded === undefined) {
      setInternalExpanded(newValue);
    }
    onExpandChange?.(newValue);
  };

  // Heutiger Tag
  const today = getCurrentDay();
  const todayHours = hours[today];
  const todayFormatted = formatDayHours(todayHours);

  // Status: Geöffnet/Geschlossen
  const isOpen = useMemo(() => isCurrentlyOpen(hours), [hours]);

  // Prüfen ob Öffnungszeiten vorhanden
  const hasHours = Object.keys(hours).length > 0;

  if (!hasHours && !location) {
    return null;
  }

  // Kompakter Modus: Nur "Heute geöffnet" Badge
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 ${className}`}
        style={{ color: fontColor }}
      >
        <Clock className="w-4 h-4 opacity-70" />
        <span className="text-sm font-medium">
          {todayHours?.closed ? 'Heute geschlossen' : todayFormatted}
        </span>
        {isOpen && (
          <span
            className="px-2 py-0.5 text-xs font-bold rounded-full"
            style={{
              backgroundColor: 'rgba(34,197,94,0.15)',
              color: '#22C55E',
            }}
          >
            Geöffnet
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`text-center py-6 border-t mt-6 space-y-3 ${className}`}
      style={{
        borderColor: `${fontColor}10`,
        color: fontColor,
      }}
    >
      {/* Collapsed Header (klickbar) */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-center gap-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer group"
        aria-expanded={isExpanded}
        aria-controls="opening-hours-list"
      >
        <Clock className="w-4 h-4 shrink-0" />
        <span className="text-xs font-medium">
          {isExpanded ? 'Öffnungszeiten' : `Heute: ${todayFormatted}`}
        </span>

        {/* Open/Closed Badge */}
        {!isExpanded && hasHours && (
          <span
            className="px-1.5 py-0.5 text-[10px] font-bold rounded-full"
            style={{
              backgroundColor: isOpen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: isOpen ? '#22C55E' : '#EF4444',
            }}
          >
            {isOpen ? 'Offen' : 'Geschlossen'}
          </span>
        )}

        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded: Vollständige Wochenübersicht */}
      {isExpanded && hasHours && (
        <div
          id="opening-hours-list"
          className="mt-3 space-y-1.5 text-left max-w-[220px] mx-auto animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {DAY_ORDER.map((dayKey) => {
            const dayHours = hours[dayKey];
            const isToday = dayKey === today;

            return (
              <div
                key={dayKey}
                className={`flex justify-between text-xs py-1.5 border-b last:border-0 ${
                  isToday ? 'font-bold' : 'opacity-80'
                }`}
                style={{
                  borderColor: `${fontColor}08`,
                  backgroundColor: isToday ? `${fontColor}05` : 'transparent',
                  marginLeft: isToday ? '-8px' : '0',
                  marginRight: isToday ? '-8px' : '0',
                  paddingLeft: isToday ? '8px' : '0',
                  paddingRight: isToday ? '8px' : '0',
                  borderRadius: isToday ? 'var(--radius-button, 4px)' : '0',
                }}
              >
                <span className="capitalize flex items-center gap-1">
                  {DAY_NAMES[dayKey]}
                  {isToday && (
                    <span
                      className="text-[9px] px-1 py-0.5 rounded"
                      style={{
                        backgroundColor: `${fontColor}15`,
                      }}
                    >
                      Heute
                    </span>
                  )}
                </span>
                <span
                  className={dayHours?.closed ? 'text-red-500' : ''}
                  style={{ color: dayHours?.closed ? '#EF4444' : fontColor }}
                >
                  {formatDayHours(dayHours)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded: Keine Zeiten hinterlegt */}
      {isExpanded && !hasHours && (
        <p className="text-xs italic opacity-50 text-center mt-2">
          Keine Öffnungszeiten hinterlegt
        </p>
      )}

      {/* Location (immer sichtbar wenn vorhanden) */}
      {location && (
        <div
          className="flex items-center justify-center gap-2 opacity-70 mt-2 max-w-full px-4"
          style={{ color: fontColor }}
        >
          <MapPin className="w-4 h-4 shrink-0 flex-none" />
          <span className="text-xs font-medium truncate">{location}</span>
        </div>
      )}
    </div>
  );
});

export default OpeningHours;

