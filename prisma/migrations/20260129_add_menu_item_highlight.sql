-- Migration: Add is_highlight column to menu items
-- Date: 2026-01-29
-- Purpose: Enable users to mark up to 3 dishes as highlights for homepage display

-- Add is_highlight column to existing tables
-- Note: Prisma uses JSON for menuItems, so this might be schema-only

-- If using separate menu_items table:
-- ALTER TABLE menu_items ADD COLUMN is_highlight BOOLEAN DEFAULT false;
-- CREATE INDEX idx_menu_items_highlight ON menu_items(is_highlight) WHERE is_highlight = true;

-- Since menuItems are stored as JSON in configurations table,
-- the column is already flexible. This migration serves as documentation.

-- Update Prisma schema to reflect the new field:
-- MenuItem {
--   id: string
--   name: string
--   description?: string
--   price: number | string
--   category?: string
--   imageUrl?: string
--   image?: object
--   images?: array
--   isHighlight?: boolean  // ✅ NEW FIELD
-- }

-- No actual SQL needed for JSON fields, but adding comment for reference:
COMMENT ON COLUMN configurations.menu_items IS 'JSON array of menu items. Each item can have optional isHighlight boolean field for homepage display (max 3)';

