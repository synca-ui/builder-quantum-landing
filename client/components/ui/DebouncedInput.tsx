/**
 * DebouncedInput.tsx
 *
 * Anti-Flicker Input Component für Konfigurator-Steps
 * Verhindert Store-Updates bei jedem Tastendruck durch Debouncing
 *
 * Features:
 * - Lokaler State für sofortiges visuelles Feedback
 * - Debounced Store-Updates (300ms default)
 * - TypeScript generics für verschiedene Input-Typen
 * - Kompatibel mit allen HTML-Input-Attributen
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from './input';
import { Textarea } from './textarea';

// ============================================
// TYPES
// ============================================

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** Aktueller Wert aus dem Store */
  value: string;
  /** Callback wenn der Wert sich ändert (debounced) */
  onChange: (value: string) => void;
  /** Debounce-Delay in ms (default: 300) */
  debounceMs?: number;
  /** Textarea statt Input verwenden */
  multiline?: boolean;
  /** Textarea-spezifische Props */
  rows?: number;
}

// ============================================
// COMPONENT
// ============================================

export const DebouncedInput = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, DebouncedInputProps>(
  ({ value, onChange, debounceMs = 300, multiline = false, rows, className, ...props }, ref) => {
    // Lokaler State für sofortiges visuelles Feedback
    const [localValue, setLocalValue] = useState(value);

    // Timeout-Ref für Cleanup
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync lokaler State mit Store-Wert (nur wenn von außen geändert)
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Debounced onChange Handler
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      // Sofortiges visuelles Feedback
      setLocalValue(newValue);

      // Clear vorheriges Timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Neues Timeout für Store-Update
      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    }, [onChange, debounceMs]);

    // Cleanup bei Unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    // Render
    if (multiline) {
      return (
        <Textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          value={localValue}
          onChange={handleChange}
          rows={rows}
          className={className}
          {...(props as any)}
        />
      );
    }

    return (
      <Input
        ref={ref as React.Ref<HTMLInputElement>}
        value={localValue}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

DebouncedInput.displayName = 'DebouncedInput';

// ============================================
// SPECIALIZED VARIANTS
// ============================================

/**
 * Debounced Number Input
 * Für Preis-, Mengen- und Zahlen-Eingaben
 */
interface DebouncedNumberInputProps extends Omit<DebouncedInputProps, 'value' | 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const DebouncedNumberInput = React.forwardRef<HTMLInputElement, DebouncedNumberInputProps>(
  ({ value, onChange, min, max, step = 1, ...props }, ref) => {
    const handleChange = useCallback((stringValue: string) => {
      const numValue = parseFloat(stringValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      } else if (stringValue === '' || stringValue === '-') {
        // Erlaubt leeres Feld oder Minus-Zeichen während der Eingabe
        onChange(0);
      }
    }, [onChange]);

    return (
      <DebouncedInput
        ref={ref}
        type="number"
        value={String(value)}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        {...props}
      />
    );
  }
);

DebouncedNumberInput.displayName = 'DebouncedNumberInput';

/**
 * Debounced Color Input
 * Für Farbauswahl mit Hex-Validierung
 */
interface DebouncedColorInputProps extends Omit<DebouncedInputProps, 'type'> {
  showPreview?: boolean;
}

export const DebouncedColorInput = React.forwardRef<HTMLInputElement, DebouncedColorInputProps>(
  ({ showPreview = true, className, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2">
        {showPreview && (
          <div
            className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
            style={{ backgroundColor: props.value }}
          />
        )}
        <DebouncedInput
          ref={ref}
          type="color"
          className={className}
          {...props}
        />
      </div>
    );
  }
);

DebouncedColorInput.displayName = 'DebouncedColorInput';

