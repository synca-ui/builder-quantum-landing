/**
 * Example Usage: Neue Shared Components
 *
 * Zeigt wie die neuen Components mit dem ConfiguratorStore integriert werden


import React from 'react';
import { HeroSection, MenuSection, BusinessHoursSection, PriceTag } from '@/components/shared';
import { useConfiguratorStore } from '@/store/configuratorStore';

// ============================================
// EXAMPLE INTEGRATION
// ============================================

export function ExampleWebsiteLayout() {
  const {
    // Business Info
    name,
    description,
    slogan,
    heroImage,
    location,

    // Design
    primaryColor,
    fontColor,
    backgroundColor,
    priceColor,
    buttonColor,
    buttonTextColor,

    // Reservations
    reservationsEnabled,
    reservationButtonColor,
    reservationButtonTextColor,
    reservationButtonShape,

    // Content
    menuItems,
    businessHours,

    // Features
    onlineOrdering
  } = useConfiguratorStore();

  return (
    <div className="min-h-screen" style={{ backgroundColor, color: fontColor }}>
      <HeroSection
        name={name}
        slogan={slogan}
        description={description}
        heroImage={heroImage}
        location={location}
        primaryColor={primaryColor}
        fontColor={fontColor}
        backgroundColor={backgroundColor}
        onlineOrdering={onlineOrdering}
        reservationsEnabled={reservationsEnabled}
        reservationButtonColor={reservationButtonColor}
        reservationButtonTextColor={reservationButtonTextColor}
        reservationButtonShape={reservationButtonShape}
        buttonColor={buttonColor}
        buttonTextColor={buttonTextColor}
        onOrderClick={() => console.log('Order clicked')}
        onReservationClick={() => console.log('Reservation clicked')}
        onLearnMoreClick={() => console.log('Learn more clicked')}
      />

      {/* 2. BUSINESS HOURS SECTION}
      <BusinessHoursSection
        businessHours={businessHours}
        location={location}
        businessName={name}
        fontColor={fontColor}
        backgroundColor={backgroundColor}
        primaryColor={primaryColor}
      />

      {/* 3. MENU SECTION}
      <MenuSection
        menuItems={menuItems}
        priceColor={priceColor}
        primaryColor={primaryColor}
        fontColor={fontColor}
        backgroundColor={backgroundColor}
        onAddToCart={(item) => console.log('Added to cart:', item)}
      />

      {/* 4. EXAMPLE: Standalone PriceTag Usage}
      <section className="py-8 text-center">
        <h3 className="text-2xl mb-4">Beispiel: PriceTag Komponente</h3>
        <div className="flex justify-center gap-4">
          <PriceTag price={12.50} color={priceColor} />
          <PriceTag price={8.90} color={primaryColor} />
          <PriceTag price={15} color="#ff6b6b" currency="USD" />
        </div>
      </section>
    </div>
  );
}

// ============================================
// MIGRATION FROM OLD EDITOR CARDS
// ============================================

/**
 * So ersetzt du die alten Editor Cards:
 *
 * ALT (Editor Cards):
 * <ReservationsCard
 *   settings={{ enabled: true }}
 *   onChange={...}
 * />
 *
 * NEU (Shared Components):
 * <HeroSection
 *   reservationsEnabled={true}
 *   onReservationClick={handleReservation}
 * />
 *
 * ALT (MenuItemsCard):
 * <MenuItemsCard
 *   items={menuItems}
 *   onChange={...}
 * />
 *
 * NEU (MenuSection):
 * <MenuSection
 *   menuItems={menuItems}
 *   priceColor={priceColor}
 *   onAddToCart={handleAddToCart}
 * />
 */
