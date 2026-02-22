/**
 * FIXED: DebouncedInput.tsx
 *
 * Optimiert für bessere Performance und verhindert unnötige Store-Updates
 *
 * Änderungen:
 * 1. useEffect Dependencies optimiert (verhindert Loop)
 * 2. Cleanup bei Unmount verbessert
 * 3. Nur onChange triggern wenn Wert sich wirklich geändert hat
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";

// ============================================
// TYPES
// ============================================

interface DebouncedInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value"
  > {
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

export const DebouncedInput = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  DebouncedInputProps
>(
  (
    {
      value,
      onChange,
      debounceMs = 300,
      multiline = false,
      rows,
      className,
      ...props
    },
    ref,
  ) => {
    // Lokaler State für sofortiges visuelles Feedback
    const [localValue, setLocalValue] = useState(value);

    // Timeout-Ref für Cleanup
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ✅ FIX: Ref für vorherigen Wert - verhindert unnötige Updates
    const prevValueRef = useRef(value);

    // ✅ FIX: Sync lokaler State mit Store-Wert NUR wenn extern geändert
    useEffect(() => {
      // Nur updaten wenn sich der externe Wert wirklich geändert hat
      if (value !== prevValueRef.current && value !== localValue) {
        console.log("[DebouncedInput] External value changed:", {
          from: prevValueRef.current,
          to: value,
        });
        setLocalValue(value);
        prevValueRef.current = value;
      }
    }, [value]); // ✅ Intentionally excluding localValue

    // ✅ FIX: Debounced onChange Handler mit Gleichheitsprüfung
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;

        // Sofortiges visuelles Feedback
        setLocalValue(newValue);

        // Clear vorheriges Timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // ✅ FIX: Nur Store updaten wenn sich der Wert geändert hat
        if (newValue !== prevValueRef.current) {
          // Neues Timeout für Store-Update
          timeoutRef.current = setTimeout(() => {
            console.log("[DebouncedInput] Triggering onChange:", {
              from: prevValueRef.current,
              to: newValue,
            });
            prevValueRef.current = newValue;
            onChange(newValue);
          }, debounceMs);
        }
      },
      [onChange, debounceMs],
    );

    // ✅ FIX: Blur Handler - sofortiges Update
    const handleBlur = useCallback(() => {
      // Wenn noch ein Timeout läuft, sofort ausführen
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Nur onChange triggern wenn Wert sich geändert hat
      if (localValue !== prevValueRef.current) {
        console.log("[DebouncedInput] Blur - immediate update:", {
          from: prevValueRef.current,
          to: localValue,
        });
        prevValueRef.current = localValue;
        onChange(localValue);
      }
    }, [localValue, onChange]);

    // ✅ FIX: Enter-Taste Handler
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !multiline) {
          // Blur triggert sofortiges Update
          e.currentTarget.blur();
        }
      },
      [multiline],
    );

    // ✅ FIX: Cleanup bei Unmount - führe pending Updates aus
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          // Final update bei Unmount
          if (localValue !== prevValueRef.current) {
            onChange(localValue);
          }
        }
      };
    }, []); // ✅ Empty deps - nur bei Mount/Unmount

    // Render
    if (multiline) {
      return (
        <Textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
    );
  },
);

DebouncedInput.displayName = "DebouncedInput";

// ============================================
// SPECIALIZED VARIANTS
// ============================================

/**
 * Debounced Number Input
 * Für Preis-, Mengen- und Zahlen-Eingaben
 */
interface DebouncedNumberInputProps
  extends Omit<DebouncedInputProps, "value" | "onChange"> {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const DebouncedNumberInput = React.forwardRef<
  HTMLInputElement,
  DebouncedNumberInputProps
>(({ value, onChange, min, max, step = 1, ...props }, ref) => {
  const handleChange = useCallback(
    (stringValue: string) => {
      const numValue = parseFloat(stringValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      } else if (stringValue === "" || stringValue === "-") {
        // Erlaubt leeres Feld oder Minus-Zeichen während der Eingabe
        onChange(0);
      }
    },
    [onChange],
  );

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
});

DebouncedNumberInput.displayName = "DebouncedNumberInput";

/**
 * Debounced Color Input
 * Für Farbauswahl mit Hex-Validierung
 */
interface DebouncedColorInputProps extends Omit<DebouncedInputProps, "type"> {
  showPreview?: boolean;
}

export const DebouncedColorInput = React.forwardRef<
  HTMLInputElement,
  DebouncedColorInputProps
>(({ showPreview = true, className, ...props }, ref) => {
  return (
    <div className="flex items-center gap-2">
      {showPreview && (
        <div
          className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
          style={{ backgroundColor: props.value }}
        />
      )}
      <DebouncedInput ref={ref} type="color" className={className} {...props} />
    </div>
  );
});

DebouncedColorInput.displayName = "DebouncedColorInput";

// ============================================
// PERFORMANCE NOTES
// ============================================

/**
 * Diese Component verhindert Performance-Probleme durch:
 *
 * 1. **Lokaler State**: Sofortiges visuelles Feedback ohne Store-Update
 * 2. **Debouncing**: Store-Updates nur alle 300ms (konfigurierbar)
 * 3. **Gleichheitsprüfung**: onChange nur wenn Wert sich wirklich ändert
 * 4. **Blur-Handling**: Sofortiges Update beim Verlassen des Feldes
 * 5. **Cleanup**: Pending Updates werden bei Unmount ausgeführt
 *
 * WICHTIG: useEffect Dependencies wurden bewusst minimiert um Loops zu vermeiden!
 */
