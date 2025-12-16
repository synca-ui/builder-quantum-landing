import { useMemo } from 'react';
import { LiquidMenuItem, LiquidContext, LiquidMenuResult } from '../shared/types/liquidUI';

/**
 * Category display order (earlier in array = higher priority)
 */
const CATEGORY_ORDER: Record<string, number> = {
  'breakfast': 5,
  'coffee': 5,
  'brunch': 4.5,
  'lunch': 4,
  'lunch-specials': 4,
  'appetizers': 3.5,
  'mains': 3,
  'salads': 3,
  'sides': 2.5,
  'desserts': 2,
  'drinks': 2,
  'cocktails': 1.5,
  'wine': 1.5,
  'beer': 1.5,
  'non-alcoholic': 1,
  'snacks': 0.5,
  'other': 0
};

/**
 * Determine if a menu item should be displayed based on current time
 */
function isItemVisibleByTime(
  item: LiquidMenuItem,
  now: Date
): boolean {
  if (!item.displayRules) return true;

  const { startHour, endHour } = item.displayRules;
  if (startHour !== undefined && endHour !== undefined) {
    const currentHour = now.getHours();
    // Handle cases where end_hour < start_hour (e.g., midnight snacks: 22:00-06:00)
    if (startHour < endHour) {
      if (currentHour < startHour || currentHour >= endHour) {
        return false;
      }
    } else {
      if (currentHour < startHour && currentHour >= endHour) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Determine if a menu item should be displayed based on day of week
 */
function isItemVisibleByDay(
  item: LiquidMenuItem,
  now: Date
): boolean {
  if (!item.displayRules || !item.displayRules.daysOfWeek) {
    return true;
  }

  const dayOfWeek = now.getDay();
  return item.displayRules.daysOfWeek.includes(dayOfWeek);
}

/**
 * Determine if a menu item should be displayed based on number of guests
 */
function isItemVisibleByGuests(
  item: LiquidMenuItem,
  guests?: number
): boolean {
  if (guests === undefined || !item.displayRules) return true;

  const { minGuests, maxGuests } = item.displayRules;
  if (minGuests !== undefined && guests < minGuests) return false;
  if (maxGuests !== undefined && guests > maxGuests) return false;

  return true;
}

/**
 * Calculate priority score for sorting
 */
function calculatePriority(item: LiquidMenuItem, context: LiquidContext): number {
  let score = item.priority ?? 50;

  // Boost items that match current time category
  const currentHour = context.currentHour;
  if (item.category) {
    const categoryLower = item.category.toLowerCase();
    if (currentHour >= 6 && currentHour < 11 && categoryLower.includes('breakfast')) {
      score += 20;
    } else if (currentHour >= 11 && currentHour < 15 && categoryLower.includes('lunch')) {
      score += 20;
    } else if (currentHour >= 17 && currentHour < 23 && categoryLower.includes('dinner')) {
      score += 20;
    } else if (currentHour >= 22 || currentHour < 6) {
      if (categoryLower.includes('cocktail') || categoryLower.includes('snack')) {
        score += 15;
      }
    }
  }

  // Boost recently ordered items (social proof)
  if (item.lastOrderedMinutesAgo !== undefined && item.lastOrderedMinutesAgo < 30) {
    score += 10;
  }

  return score;
}

/**
 * Main hook: Filter and sort menu items based on context (time, day, guests, etc.)
 */
export function useLiquidMenu(
  items: LiquidMenuItem[] = [],
  context?: Partial<LiquidContext>
): LiquidMenuResult {
  return useMemo(() => {
    // Set up context with defaults
    const now = context?.now ?? new Date();
    const currentHour = context?.currentHour ?? now.getHours();
    const dayOfWeek = context?.dayOfWeek ?? now.getDay();
    const guests = context?.guests;

    const ctx: LiquidContext = {
      now,
      currentHour,
      dayOfWeek,
      guests,
      timezone: context?.timezone,
      specialOccasion: context?.specialOccasion,
      dayOfMonth: context?.dayOfMonth ?? now.getDate(),
      month: context?.month ?? now.getMonth() + 1
    };

    // Track which filtering rules are applied
    const appliedRules = {
      timeFiltering: false,
      dayFiltering: false,
      guestFiltering: false,
      specialOccasionFiltering: false
    };

    // Filter items
    const filtered = items.filter(item => {
      const visibleByTime = isItemVisibleByTime(item, now);
      const visibleByDay = isItemVisibleByDay(item, now);
      const visibleByGuests = isItemVisibleByGuests(item, guests);

      if (!visibleByTime) appliedRules.timeFiltering = true;
      if (!visibleByDay) appliedRules.dayFiltering = true;
      if (!visibleByGuests) appliedRules.guestFiltering = true;

      return visibleByTime && visibleByDay && visibleByGuests;
    });

    // Sort items
    const sorted = filtered.sort((a, b) => {
      // Primary sort: priority score
      const priorityA = calculatePriority(a, ctx);
      const priorityB = calculatePriority(b, ctx);
      if (priorityA !== priorityB) return priorityB - priorityA;

      // Secondary sort: category order
      const catA = CATEGORY_ORDER[a.category?.toLowerCase() || ''] ?? 0;
      const catB = CATEGORY_ORDER[b.category?.toLowerCase() || ''] ?? 0;
      if (catA !== catB) return catB - catA;

      // Tertiary sort: original order
      return items.indexOf(a) - items.indexOf(b);
    });

    // Determine suggested category and contextual message
    let suggestedCategory: string | undefined;
    let contextualMessage: string | undefined;

    if (currentHour >= 6 && currentHour < 11) {
      suggestedCategory = 'Breakfast';
      contextualMessage = 'Breakfast available until 11:00';
    } else if (currentHour >= 11 && currentHour < 15) {
      suggestedCategory = 'Lunch Specials';
      contextualMessage = 'Lunch specials available until 15:00';
    } else if (currentHour >= 15 && currentHour < 17) {
      suggestedCategory = 'Afternoon Menu';
      contextualMessage = 'Afternoon menu available';
    } else if (currentHour >= 17 && currentHour < 23) {
      suggestedCategory = 'Dinner';
      contextualMessage = 'Full dinner menu available';
    } else if (currentHour >= 22 || currentHour < 6) {
      suggestedCategory = 'Late Night';
      contextualMessage = 'Late night menu available';
    }

    return {
      items: sorted,
      appliedRules,
      suggestedCategory,
      contextualMessage
    };
  }, [items, context]);
}

export default useLiquidMenu;
