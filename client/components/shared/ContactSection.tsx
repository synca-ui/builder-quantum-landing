/**
 * Shared ContactSection Component
 *
 * Zeigt Kontaktinformationen: Adresse, Telefon, E-Mail, Social Links
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo } from 'react';
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter, Globe } from 'lucide-react';
import type { OpeningHours as OpeningHoursType, ContactInfo } from '@/types/domain';

// ============================================
// TYPES
// ============================================

export interface ContactSectionProps {
  /** Standort/Adresse */
  location?: string;
  /** Kontaktmethoden */
  contactMethods: string[];
  /** Social Media Links */
  socialMedia: Record<string, string>;
  /** Telefonnummer */
  phone?: string;
  /** E-Mail */
  email?: string;
  /** Öffnungszeiten */
  openingHours?: OpeningHoursType;
  /** Schriftfarbe */
  fontColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
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

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  website: Globe,
};

function formatDayHours(day: { open: string; close: string; closed: boolean } | undefined): string {
  if (!day) return 'Keine Angabe';
  if (day.closed) return 'Geschlossen';
  return `${day.open} - ${day.close}`;
}

// ============================================
// COMPONENT
// ============================================

export const ContactSection = memo(function ContactSection({
  location,
  contactMethods,
  socialMedia,
  phone,
  email,
  openingHours,
  fontColor,
  backgroundColor,
  isPreview = false,
  className = '',
}: ContactSectionProps) {

  const handlePhoneClick = () => {
    if (!isPreview && phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmailClick = () => {
    if (!isPreview && email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const handleSocialClick = (url: string) => {
    if (!isPreview) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const hasOpeningHours = openingHours && Object.keys(openingHours).length > 0;
  const hasSocialMedia = Object.keys(socialMedia).length > 0;
  const hasContactInfo = location || phone || email || contactMethods.length > 0;

  return (
    <section
      className={`space-y-8 animate-in fade-in duration-300 ${className}`}
      style={{ color: fontColor }}
    >
      {/* Title */}
      <h2
        className="text-3xl font-bold text-center leading-tight"
        style={{
          color: fontColor,
          fontSize: 'var(--font-h2-size, 1.875rem)',
          fontWeight: 'var(--font-h2-weight, 700)',
        }}
      >
        Kontakt
      </h2>

      {/* Contact Card */}
      {hasContactInfo && (
        <div
          className="p-6 space-y-6 backdrop-blur-sm"
          style={{
            backgroundColor: `${fontColor}05`,
            borderRadius: 'var(--radius-card, 16px)',
            border: `1px solid ${fontColor}10`,
            boxShadow: 'var(--shadow-card, 0 4px 12px rgba(0,0,0,0.05))',
          }}
        >
          {/* Address */}
          {location && (
            <div className="flex items-start gap-4">
              <div
                className="mt-1 p-2 rounded-full"
                style={{ backgroundColor: `${fontColor}08` }}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm mb-1 opacity-90">Adresse</div>
                <div
                  className="text-sm opacity-80 leading-relaxed"
                  style={{ fontSize: 'var(--font-body-size, 0.875rem)' }}
                >
                  {location}
                </div>
              </div>
            </div>
          )}

          {/* Phone */}
          {phone && (
            <button
              onClick={handlePhoneClick}
              className="flex items-center gap-4 w-full text-left hover:opacity-80 transition-opacity"
            >
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: `${fontColor}08` }}
              >
                <Phone className="w-4 h-4" />
              </div>
              <div
                className="text-sm"
                style={{ fontSize: 'var(--font-body-size, 0.875rem)' }}
              >
                {phone}
              </div>
            </button>
          )}

          {/* Email */}
          {email && (
            <button
              onClick={handleEmailClick}
              className="flex items-center gap-4 w-full text-left hover:opacity-80 transition-opacity"
            >
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: `${fontColor}08` }}
              >
                <Mail className="w-4 h-4" />
              </div>
              <div
                className="text-sm"
                style={{ fontSize: 'var(--font-body-size, 0.875rem)' }}
              >
                {email}
              </div>
            </button>
          )}

          {/* Legacy Contact Methods */}
          {contactMethods.map((method, i) => (
            <div key={i} className="flex items-center gap-4">
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: `${fontColor}08` }}
              >
                {method.includes('@') ? (
                  <Mail className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
              </div>
              <div
                className="text-sm"
                style={{ fontSize: 'var(--font-body-size, 0.875rem)' }}
              >
                {method}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Opening Hours */}
      {hasOpeningHours && (
        <div>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 opacity-70" />
            Öffnungszeiten
          </h3>
          <div className="space-y-2 opacity-90">
            {Object.entries(openingHours).map(([day, hours]) => (
              <div
                key={day}
                className="flex justify-between text-xs py-2 border-b last:border-0"
                style={{ borderColor: `${fontColor}08` }}
              >
                <span className="capitalize opacity-80 font-medium">
                  {DAY_NAMES[day] || day}
                </span>
                <span
                  className="font-bold"
                  style={{ color: hours?.closed ? '#EF4444' : fontColor }}
                >
                  {formatDayHours(hours)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Media Links */}
      {hasSocialMedia && (
        <div className="flex justify-center gap-6 py-6 opacity-80">
          {Object.entries(socialMedia).map(([platform, url]) => {
            if (!url) return null;
            const Icon = SOCIAL_ICONS[platform.toLowerCase()] || Globe;

            return (
              <button
                key={platform}
                onClick={() => handleSocialClick(url)}
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all hover:opacity-100 hover:scale-110"
                style={{ backgroundColor: `${fontColor}10` }}
                aria-label={`${platform} öffnen`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!hasContactInfo && !hasOpeningHours && !hasSocialMedia && (
        <div className="text-center py-8 opacity-50">
          <p className="text-sm">Keine Kontaktinformationen hinterlegt</p>
        </div>
      )}
    </section>
  );
});

export default ContactSection;

