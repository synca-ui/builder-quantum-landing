# Sync.a V2 Features Guide

# Maitr V2 Features Guide

Quick reference guide for using the new V2 features.

## 🎯 New Features Overview

### 1. Advanced Card-Based Editor
**Location**: `/configurator/advanced`

A modern, modular configuration interface that replaces the multi-step wizard.

#### Features:
- **All settings in one place** - No more stepping through 15+ screens
- **Expandable sections** - Click to expand/collapse any section
- **Live preview** (coming soon) - See changes in real-time
- **Auto-save** - Changes persist to localStorage automatically
- **Clean grid layout** - Cards on left, preview on right

#### Available Cards:
1. **Business Information** - Name, type, location, slogan, description
2. **Design & Styling** - Colors, fonts, template selection
3. **Pages & Features** - Which pages to include (home, menu, gallery, contact)
4. **Menu Items** - Add, edit, delete menu items with prices
5. **Opening Hours** - Set business hours for each day
6. **Reservations** - Configure table booking options
7. **Contact & Social** - Phone, email, social media links
8. **Media Gallery** - Upload and manage images
9. **Advanced Features** - Online ordering, team area, loyalty programs
10. **Settings & SEO** - SEO settings, analytics, custom code
11. **Publish** - Domain selection and publish button

#### Usage:
```
1. Go to /configurator/advanced
2. Click a card to expand it
3. Fill in your information
4. Click "Save Draft" to save
5. Click "Publish" to go live
```

### 2. Social Proof Badges (Order Tracking)
**Real-time indicators showing item popularity**

#### How It Works:
- When orders are created (via Stripe, POS, or manually), they're logged
- Frontend polls for order statistics every 30 seconds
- Menu items display "Ordered X mins ago" badges
- Badges show trending items and recent activity

#### What You See:
On published sites, menu items show:
- 🟢 Green "Popular" badge if ordered recently
- "Ordered X mins ago" or "Ordered X hours ago"
- Pulse animation for very recent orders

#### Backend:
- Stripe webhook → `/api/webhooks/stripe` → logs order event
- Frontend hook → `useRecentOrders()` → polls `/api/orders/:webAppId/menu-stats`
- Database table → `order_events` → stores all orders

See [STRIPE_SETUP.md](./STRIPE_SETUP.md) for Stripe integration instructions.

### 3. JSON-LD Schema (Agentic Web)
**AI-readable structured data for your business**

#### What It Does:
- Generates Schema.org JSON-LD for your restaurant/business
- Includes menu items, hours, contact info, location
- Makes your site readable by AI agents (ChatGPT, Google Assistant, etc.)
- Improves SEO with structured data

#### Automatic:
- Injected into page `<head>` automatically
- Includes:
  - Business name, type, location
  - Contact information
  - Opening hours
  - Menu items with prices
  - Dietary flags (vegan, vegetarian, gluten-free)
  - Aggregate ratings and reviews

#### Testing:
- Validate schema at: https://schema.org/validate
- Check Google Search Console for indexing

### 4. Liquid UI (Context-Aware Menus)
**Smart menu sorting based on time, day, and guests**

#### How It Works:
- Menu items can have display rules (time ranges, specific days)
- Items automatically filtered based on current time
- Breakfast items show 6-11 AM, lunch 11 AM-3 PM, dinner 5-11 PM
- Items boost based on popularity and context

#### Future Use:
- Admin interface to set display rules per item
- Context-aware suggestions ("Lunch specials available until 3 PM")
- Mobile app integration for smart recommendations

---

## 📱 Feature Matrices

### Page Types Available
- ✅ Home - Hero section with business info
- ✅ Menu - Grid view of menu items
- ✅ Gallery - Image gallery showcase
- ✅ About - Business description
- ✅ Contact - Contact info and social links
- ✅ Settings - App settings (admin only)

### Design Templates
- Minimalist - Clean, simple, content-focused
- Modern - Bold colors, glassmorphism effects
- Stylish - Elegant serif typography
- Cozy - Warm, inviting aesthetic

### Font Families
- Inter (default)
- Playfair Display (elegant serif)
- Merriweather (classic serif)
- Roboto (geometric sans-serif)

### Advanced Features (Toggle On/Off)
- Online Ordering - Accept orders directly
- Online Store - Sell products
- Team Area - Multi-user access
- Loyalty Program - Points-based rewards
- Guest Checkout - No account required
- Analytics Tracking - Visitor analytics
- Custom Domain - Use your own domain
- API Access - Developer API

---

## 🔧 Technical Details

### State Management
- Uses `stepPersistence` system
- Saves to localStorage automatically
- Survives browser refresh
- Can be enabled/disabled in settings

### API Endpoints (Phase 2+)

#### Schema Generation
```
POST /api/schema/generate
Body: { businessName, location, menuItems, ... }
Returns: JSON-LD schema
```

#### Order Tracking
```
GET /api/orders/:webAppId/menu-stats
Returns: { itemId: { lastOrderedAt, recentCount, dailyCount } }

POST /api/orders/create
Body: { webAppId, menuItemName, orderSource, ... }
Returns: { success, event }
```

#### Publishing
```
POST /api/configurations/:id/publish
Returns: { success, url }
```

### Frontend Hooks

#### useRecentOrders
```typescript
const { stats, isLoading, error, refetch } = useRecentOrders(webAppId);

// stats = { itemId: { lastOrderedMinutesAgo, recentOrderCount, ... } }
```

#### useLiquidMenu
```typescript
const { items, suggestedCategory, contextualMessage } = useLiquidMenu(
  menuItems,
  { now: new Date(), guests: 4 }
);
```

---

## 📊 Database Tables

### order_events
```sql
- id: UUID (primary key)
- web_app_id: UUID (foreign key)
- menu_item_id: string
- menu_item_name: string
- order_source: enum (stripe, pos, manual, other)
- amount: integer (cents)
- user_avatar_url: text
- user_email: text
- created_at: timestamp
```

### ai_generated_schemas
```sql
- id: UUID (primary key)
- web_app_id: UUID (foreign key)
- schema: JSONB (full Schema.org object)
- generated_at: timestamp
```

---

## 🚀 Deployment Checklist

Before going live:

- [ ] Configure Stripe webhook (see STRIPE_SETUP.md)
- [ ] Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET env vars
- [ ] Test payment → order event flow
- [ ] Verify JSON-LD schema with Google Schema Markup Tester
- [ ] Check all pages render correctly
- [ ] Test mobile responsiveness
- [ ] Verify social proof badges update
- [ ] Set up analytics (Google Analytics ID)
- [ ] Configure custom domain (if needed)
- [ ] Enable SSL/HTTPS

---

## 🆘 Troubleshooting

### Badges Not Showing
- Check if `/api/orders/:webAppId/menu-stats` returns data
- Verify orders were created (check database)
- Browser console may show fetch errors
- Clear browser cache and refresh

### Schema Not Appearing
- Inspect page source for `<script type="application/ld+json">`
- Validate at https://schema.org/validate
- Check RestaurantJsonLd component is included in Site.tsx

### Editor Not Saving
- Check localStorage is enabled in browser
- Verify stepPersistence is enabled (toggle in settings)
- Check browser console for errors
- Try opening in private/incognito window

### Stripe Webhook Not Working
- Verify webhook URL is publicly accessible
- Check STRIPE_WEBHOOK_SECRET env var is set correctly
- Review Stripe Dashboard webhook delivery logs
- See STRIPE_SETUP.md for detailed troubleshooting

---

## 📚 Additional Resources

- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Stripe integration guide
- [V2_IMPLEMENTATION_STATUS.md](./V2_IMPLEMENTATION_STATUS.md) - Current progress & roadmap
- [Stripe Webhook Docs](https://stripe.com/docs/webhooks)
- [Schema.org Reference](https://schema.org)
- [React Helmet Documentation](https://github.com/nfl/react-helmet)

---

## 🎓 Learning Path

For new developers on the team:

1. **Start here**: Read this guide
2. **Explore the code**:
   - `client/components/editor/CardBasedEditor.tsx` - Main editor
   - `client/pages/AdvancedConfigurator.tsx` - Editor page
   - `client/hooks/useRecentOrders.ts` - Order polling
   - `server/webhooks/stripe.ts` - Webhook handler
3. **Review the database**: Check `server/db/init.sql` for schema
4. **Test locally**: Run `/configurator/advanced` on dev server
5. **Try the APIs**: Use curl or Postman to test endpoints

---

**Last Updated**: December 2024  
**Version**: 2.0  
**Status**: Active Development
