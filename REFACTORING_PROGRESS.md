# Configurator Refactoring Progress

## Summary
Refactoring the monolithic `Configurator.tsx` to resolve Input Focus Loss bugs and State Synchronization issues.

## ✅ PHASE 1: COMPLETE - Centralize Shared Data
**File:** `src/lib/configurator-data.ts`

**Status:** ✅ Complete (created earlier)

**Contents:**
- `normalizeImageSrc` function
- `businessTypes` array
- `fontOptions` array  
- `pageOptions` array
- All necessary `lucide-react` icons imported

---

## 🚧 PHASE 2: IN PROGRESS - Extract & Fix Components

### ✅ Completed Components (3/14):

#### 1. `WelcomePage.tsx` ✅
**Location:** `client/components/configurator/steps/WelcomePage.tsx`

**Features:**
- Uses Zustand store directly via `useConfiguratorStore`
- Reads: `currentStep`, `businessName`, `template`
- Props: `onStart`, `currentConfigId`, `publishedUrl`
- Integrates with persistence system
- Debug panel for development

**Key Changes:**
- No formData prop - reads from Zustand
- Maintains persistence integration
- Clean separation of concerns

#### 2. `TemplateStep.tsx` ✅ (CRITICAL BUG FIX)
**Location:** `client/components/configurator/steps/TemplateStep.tsx`

**Critical Bug Fix Implemented:**
```typescript
const handleTemplateClick = (templateId: string) => {
  setSelectedTemplate(templateId);
  setPreviewTemplateId(templateId);
  // ✅ FIX: Call Zustand action immediately
  actions.design.updateTemplate(templateId);
};
```

**Features:**
- Uses `useConfiguratorActions()` hook
- Calls `actions.design.updateTemplate(id)` immediately on click
- Ensures Live Preview updates instantly
- No local state for template selection (except UI feedback)
- Props: `nextStep`, `prevStep`, `previewTemplateId`, `setPreviewTemplateId`

**Key Changes:**
- Fixed the "Split Source of Truth" issue
- Template selection now syncs to store immediately
- Preview updates without delay

#### 3. `PageStructureStep.tsx` ✅
**Location:** `client/components/configurator/steps/PageStructureStep.tsx`

**Features:**
- Uses direct store actions: `updatePageManagement`
- Reads: `selectedPages`, `businessType`
- Uses shared data from `@/lib/configurator-data` (pageOptions)
- Props: `nextStep`, `prevStep` only

**Key Changes:**
- No formData/updateFormData props
- Direct Zustand integration
- Imports page options from centralized data

---

### ✅ Batch A Complete (4/14):

#### 4. `OpeningHoursStep.tsx` ✅
**Location:** `client/components/configurator/steps/OpeningHoursStep.tsx`

**Features:**
- Uses Zustand store: `content.openingHours`, `design.fontColor`
- Actions: `content.updateOpeningHours`, `design.updateDesign`
- Local state: `useWeekdaySchedule`, `weekdayHours` (for UI convenience)
- Syncs weekday hours to store on every change
- Props: `nextStep`, `prevStep` only

**Key Changes:**
- No formData/updateFormData props
- Direct Zustand integration
- Maintains local UI state for weekday schedule toggle

#### 5. `MenuProductsStep.tsx` ✅
**Location:** `client/components/configurator/steps/MenuProductsStep.tsx`

**Features:**
- Uses Zustand store: `content.menuItems`
- Actions: `content.addMenuItem`, `content.removeMenuItem`, `content.updateMenuItem`
- Local state: `newItem` for the add form
- CSV upload with robust parsing (handles delimiters, quotes, headers)
- Image upload for individual menu items
- Uses `normalizeImageSrc` from centralized data

**Key Changes:**
- No formData/updateFormData props
- CSV import adds items directly to store
- Image handling integrated with store actions

#### 6. `ReservationsStep.tsx` ✅
**Location:** `client/components/configurator/steps/ReservationsStep.tsx`

**Features:**
- Uses Zustand store: `features.reservationsEnabled`, `features.maxGuests`, `features.notificationMethod`
- Actions: `features.toggleReservations`, `features.updateFeatureFlags`
- Button styling uses `design.primaryColor` and `design.backgroundColor`
- Time slots stored in features (with fallback defaults)
- Props: `nextStep`, `prevStep` only

**Key Changes:**
- No formData/updateFormData props
- Reservation button styling integrated with design theme
- Time slots and button shape stored in features

#### 7. `ContactSocialStep.tsx` ✅
**Location:** `client/components/configurator/steps/ContactSocialStep.tsx`

**Features:**
- Uses Zustand store: `contact.phone`, `contact.email`, `contact.contactMethods`, `contact.socialMedia`
- Actions: `contact.updateContactInfo`, `contact.updateSocialMedia`
- Controlled inputs with onChange handlers (no ref/blur pattern)
- Instagram sync toggle integrated
- Props: `nextStep`, `prevStep` only

**Key Changes:**
- No formData/updateFormData props
- Replaced setInputRef/handleInputBlur with controlled inputs
- Direct store updates on every change

---

### 📋 Remaining Components (7/14):

These need to be extracted following the same architectural pattern:

8. ❌ `MediaGalleryStep.tsx` - Photo uploads
9. ❌ `AdvancedFeaturesStep.tsx` - Feature toggles
10. ❌ `FeatureConfigStep.tsx` - Dynamic feature configuration (includes OffersStep)
11. ❌ `DomainHostingStep.tsx` - Domain selection
12. ❌ `SEOOptimizationStep.tsx` - SEO settings
13. ❌ `PreviewAdjustmentsStep.tsx` - Final preview
14. ❌ `PublishStep.tsx` - Publishing flow

---

## 🔜 PHASE 3: TODO - Clean Up Main Orchestrator

**File:** `client/pages/Configurator.tsx`

**Required Changes:**
1. Import all extracted step components
2. Remove internal component definitions
3. Refactor `renderMainContent` to use imported components
4. Keep: `useAuth`, `usePersistence`, `isInitialized` (Locked Entry)
5. Remove: Legacy `formData` state (except for persistence/preview if strictly needed)
6. Pass only navigation props (`nextStep`, `prevStep`) to step components

**Example Pattern:**
```typescript
const renderMainContent = () => {
  switch (currentStepConfig.component) {
    case "template":
      return (
        <TemplateStep
          nextStep={nextStep}
          prevStep={prevStep}
          previewTemplateId={previewTemplateId}
          setPreviewTemplateId={setPreviewTemplateId}
        />
      );
    case "page-structure":
      return <PageStructureStep nextStep={nextStep} prevStep={prevStep} />;
    // ... etc
  }
};
```

---

## 🔑 Architectural Rules Followed

### ✅ Implemented:
1. **No Nested Definitions** - All components are top-level exports
2. **Zustand Reading** - Use `useConfiguratorStore((s) => s.slice.field)` directly
3. **Zustand Writing** - Use store actions or `useConfiguratorActions()` hook
4. **Shared Data Import** - Import from `@/lib/configurator-data`
5. **Minimal Props** - Only `nextStep`, `prevStep`, and essential UI state
6. **Bug Fix** - TemplateStep calls `updateTemplate` immediately

### ⚠️ Notes:
- Some components may need `formData` for backward compatibility with preview
- Persistence layer may still reference `formData` - to be evaluated in Phase 3
- Store may need additional actions for all step needs

---

## 🧪 Testing Checklist

After completing all phases:

- [ ] Input focus is maintained when typing
- [ ] Template selection updates preview immediately
- [ ] No "Split Source of Truth" issues
- [ ] State persists correctly across sessions
- [ ] All step navigation works
- [ ] Preview updates reflect store changes
- [ ] No infinite re-render loops
- [ ] Performance is improved

---

## 📝 Next Steps

1. **Complete Phase 2** - Extract remaining 11 step components
2. **Execute Phase 3** - Clean up `Configurator.tsx` orchestrator
3. **Test thoroughly** - Verify all functionality works
4. **Remove dead code** - Clean up any unused legacy code
5. **Update imports** - Ensure all imports are correct

---

## 💡 Lessons Learned

1. **Immediate State Updates** - Always update Zustand immediately, not on "confirm"
2. **Stable References** - External constants prevent unnecessary re-renders
3. **Clear Separation** - Components shouldn't manage state, only read/write to store
4. **Type Safety** - Use TypeScript interfaces for all props
5. **Testing Strategy** - Focus on input focus and state sync as primary success criteria
