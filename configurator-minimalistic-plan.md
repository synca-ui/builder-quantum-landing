# Minimalistic Configurator Step Design Plan

## Current Issues & Solutions

### ✅ Fixed Issues: Here
1. **Template boxes too large** → Made compact with essential info only
2. **Double screen preview bug** → Created dedicated TemplatePreviewContent component
3. **Cluttered template selection** → Streamlined to essential information

## Remaining Steps to Clean Up

### 1. **Landing Page (Welcome)** ✅ Already Clean
- Simple 2-column layout
- Key benefits in bullet points
- Single CTA button
- No overwhelming information

### 2. **Template Selection (Step 0)** ✅ Just Fixed
- Compact template cards with essential info only
- Live preview on the right
- Clear selection state
- Minimal action required

### 3. **Business Information (Step 1)** 🔄 Needs Improvement
**Current Issues:**
- Too many fields visible at once
- Large form layout
- Business type cards too big

**Minimalistic Approach:**
- Progressive disclosure: Show 2-3 fields at a time
- Smaller business type selection
- Auto-save on blur
- Visual progress indicator

### 4. **Design Customization (Step 2)** 🔄 Needs Improvement
**Current Issues:**
- Overwhelming color preset grid
- Too many font options
- Complex background section

**Minimalistic Approach:**
- Start with 4 popular color presets
- Show custom colors only if needed
- 2-3 font options max
- Simplified background: color or gradient only

### 5. **Page Structure (Step 3)** 🔄 Needs Improvement
**Current Issues:**
- Grid of page options can be overwhelming
- Too much explanation text

**Minimalistic Approach:**
- Show essential pages first (Home, Menu, Contact)
- Optional pages in a separate "More pages" section
- Checkbox-style selection instead of cards

### 6. **Opening Hours (Step 4)** 🔄 Needs Improvement
**Current Issues:**
- All 7 days shown at once
- Too much vertical space

**Minimalistic Approach:**
- Compact day/time selection
- Bulk actions (copy to multiple days)
- Smart defaults based on business type

### 7. **Menu/Products (Step 5)** 🔄 Needs Improvement
**Current Issues:**
- Multiple upload options create confusion
- Large forms for each item

**Minimalistic Approach:**
- Single "Add Item" interface
- Quick add with name + price only
- Advanced options hidden behind "More details"

### 8. **Reservations (Step 6)** ✅ Relatively Clean
- Simple toggle with options
- Could be more compact

### 9. **Contact & Social (Step 7)** 🔄 Needs Improvement
**Current Issues:**
- Too many contact method fields shown
- Social media section too prominent

**Minimalistic Approach:**
- Show only phone and email initially
- "Add more contact methods" button
- Social media as optional add-on

### 10. **Media Gallery (Step 8)** ✅ Clean
- Simple drag-drop interface
- Visual preview

### 11. **Advanced Features (Step 9)** ✅ Clean
- Simple toggle cards
- Clear premium indicators

### 12. **Domain & Hosting (Step 10)** ✅ Clean
- Clear free vs paid options
- Simple setup

### 13. **Preview & Adjustments (Step 11)** 🔄 Needs Improvement
**Current Issues:**
- Too many adjustment options
- Performance metrics not essential

**Minimalistic Approach:**
- Focus on final preview only
- Quick color/title tweaks
- Remove performance section

### 14. **Publish (Step 12)** ✅ Clean
- Clear checklist
- Simple publish action

## Implementation Priority

### Phase 1: Essential UX Improvements
1. Business Information step simplification
2. Design Customization reduction
3. Page Structure streamlining

### Phase 2: Content Steps
4. Opening Hours compacting
5. Menu/Products simplification
6. Contact & Social reduction

### Phase 3: Final Polish
7. Preview step focus
8. Overall spacing and typography consistency
9. Transition animations

## Key Principles for Minimalistic Design

1. **Progressive Disclosure**: Show essential options first, advanced behind "More" buttons
2. **Smart Defaults**: Pre-fill based on business type and common patterns
3. **Visual Hierarchy**: Use typography and spacing to guide attention
4. **Single Focus**: Each step should have one primary goal
5. **Contextual Help**: Inline hints instead of separate explanations
6. **Immediate Feedback**: Live preview updates and validation
7. **Reduced Cognitive Load**: Fewer decisions per step

## Visual Consistency Guidelines

- **Colors**: Teal primary, purple secondary, gray neutrals
- **Spacing**: 16px base unit (4, 8, 16, 24, 32, 48px)
- **Typography**: Clear hierarchy with 3-4 font sizes max
- **Components**: Consistent button sizes, card styles, form elements
- **Layout**: 2-column max, generous whitespace
- **Mobile**: Stack vertically, maintain touch targets

This plan will create a more focused, less overwhelming experience while maintaining all necessary functionality.
