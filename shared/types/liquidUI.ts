/**
 * Liquid UI Types - for time-aware and context-aware content rendering
 * Allows menu items to be displayed conditionally based on time, day, guests, etc.
 */

export interface DisplayRules {
  /**
   * Start hour (0-23) when this item should be displayed
   */
  startHour?: number;

  /**
   * End hour (0-23) when this item should be displayed
   */
  endHour?: number;

  /**
   * Days of week when this item should be displayed (0 = Sunday, 1 = Monday, etc.)
   */
  daysOfWeek?: number[];

  /**
   * Minimum number of guests for this item to be shown
   */
  minGuests?: number;

  /**
   * Maximum number of guests for this item to be shown
   */
  maxGuests?: number;

  /**
   * Special occasion identifier (e.g., 'new_year', 'mothers_day', 'christmas')
   */
  specialOccasion?: string;
}

export interface LiquidMenuItem {
  /**
   * Unique identifier
   */
  id?: string;

  /**
   * Item name
   */
  name: string;

  /**
   * Item description
   */
  description?: string;

  /**
   * Price
   */
  price?: string | number;

  /**
   * Menu category (breakfast, lunch, dinner, cocktails, snacks, etc.)
   */
  category?: string;

  /**
   * Item image URL
   */
  image?: string;

  /**
   * Display rules for context-aware rendering
   */
  displayRules?: DisplayRules;

  /**
   * Priority for sorting (0-100, higher = higher in list)
   */
  priority?: number;

  /**
   * Emoji for quick visual identification
   */
  emoji?: string;

  /**
   * Dietary restrictions/flags (vegan, gluten-free, etc.)
   */
  dietaryFlags?: string[];

  /**
   * For social proof (V2.2)
   */
  lastOrderedAt?: Date;
  lastOrderedMinutesAgo?: number;
  userPhotoUrl?: string;
  recentOrderCount?: number;
}

/**
 * Context information for Liquid UI rendering
 */
export interface LiquidContext {
  /**
   * Current date/time
   */
  now: Date;

  /**
   * Current hour (0-23)
   */
  currentHour: number;

  /**
   * Current day of week (0 = Sunday, 6 = Saturday)
   */
  dayOfWeek: number;

  /**
   * Number of guests (optional, for reservation context)
   */
  guests?: number;

  /**
   * Special occasion if applicable
   */
  specialOccasion?: string;

  /**
   * User timezone (e.g., 'Europe/Berlin')
   */
  timezone?: string;

  /**
   * Day of month for special date-based displays
   */
  dayOfMonth?: number;

  /**
   * Month (1-12)
   */
  month?: number;
}

/**
 * Result of liquid menu filtering
 */
export interface LiquidMenuResult {
  /**
   * Filtered and sorted menu items
   */
  items: LiquidMenuItem[];

  /**
   * Which filtering rules were applied
   */
  appliedRules: {
    timeFiltering: boolean;
    dayFiltering: boolean;
    guestFiltering: boolean;
    specialOccasionFiltering: boolean;
  };

  /**
   * Suggested category to highlight (e.g., 'Lunch Specials', 'Happy Hour')
   */
  suggestedCategory?: string;

  /**
   * Contextual message to show (e.g., "Lunch specials available until 15:00")
   */
  contextualMessage?: string;
}
