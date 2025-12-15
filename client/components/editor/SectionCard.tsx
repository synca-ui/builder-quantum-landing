import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SectionCardProps {
  /**
   * Unique identifier for the section
   */
  id: string;
  /**
   * Section title displayed in the header
   */
  title: string;
  /**
   * Optional icon or JSX element
   */
  icon?: React.ReactNode;
  /**
   * Whether the section is initially expanded
   */
  defaultExpanded?: boolean;
  /**
   * Callback when section expanded/collapsed
   */
  onExpandChange?: (expanded: boolean) => void;
  /**
   * Section content
   */
  children: React.ReactNode;
  /**
   * Optional badge (e.g., "Required", "Pro")
   */
  badge?: string;
  /**
   * Optional description text under title
   */
  description?: string;
  /**
   * Custom className for the card container
   */
  className?: string;
}

/**
 * Reusable collapsible card component for the card-based editor
 * Features:
 * - Smooth expand/collapse animation (Framer Motion)
 * - Icon support
 * - Badge support (e.g., "Required")
 * - Description text
 */
export function SectionCard({
  id,
  title,
  icon,
  defaultExpanded = true,
  onExpandChange,
  children,
  badge,
  description,
  className = ''
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onExpandChange?.(newState);
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow ${className}`}
      data-section-id={id}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-white transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`content-${id}`}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {icon && (
            <div className="flex-shrink-0 w-5 h-5 text-gray-600">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {title}
              {badge && (
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  {badge}
                </span>
              )}
            </h3>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Chevron Icon */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 ml-4"
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={`content-${id}`}
            id={`content-${id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              duration: 0.3,
              ease: 'easeInOut'
            }}
          >
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SectionCard;
