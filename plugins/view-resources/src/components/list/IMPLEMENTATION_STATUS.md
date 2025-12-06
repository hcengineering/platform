# List Performance Optimization - Implementation Status

## ✅ Phase 0: Limit Category Count (COMPLETED ✅)

**Goal:** Limit initial categories to 20, add "Show More" button

**Status:** ✅ Implemented

**Changes made in:**
- ✅ `ListCategories.svelte` - Added category limit logic and Show More button
  - Added `maxInitialCategories = 20` constant
  - Added `showAllCategories` state
  - Added `displayedCategories` reactive statement (only for level 0)
  - Added "Show More" button with count display

**Implementation:**
```typescript
// ListCategories.svelte - Category limiting
const maxInitialCategories = 20
let showAllCategories = false

$: displayedCategories = (level === 0 && !showAllCategories)
  ? categories.slice(0, maxInitialCategories)
  : categories

$: hasMoreCategories = level === 0 && categories.length > maxInitialCategories
```

**Expected improvement:** 50-90% fewer initial queries ✅

---

## ✅ Phase 1: Pre-fetch Category References (COMPLETED ✅ - IMPROVED)

**Goal:** Pre-fetch referenced documents for category groupBy to eliminate presenter queries

**Status:** ✅ Fully implemented and integrated with reactive queries

### ✅ Completed:

1. **New utility functions in `utils.ts`:**
   - ✅ `isRefAttribute()` - Check if attribute is Ref type
   - ✅ `buildCategoryReferenceLookups()` - Pre-fetch all category references
   - ✅ `getCategoryReference()` - Get reference from lookup map
   - ✅ Exported from `index.ts`

2. **List.svelte changes:**
   - ✅ Import `isRefAttribute`, `getObjectValue`, `RefTo`
   - ✅ Add `categoryRefsMap` state
   - ✅ Use `createQuery()` for each ref-type groupBy key (reactive!)
   - ✅ Reactive block manages queries (creates, updates, unsubscribes)
   - ✅ Automatically detects Ref attributes and fetches in bulk
   - ✅ Pass `categoryRefsMap` to ListCategories

3. **ListCategories.svelte changes:**
   - ✅ Add `categoryRefsMap` prop
   - ✅ Pass to ListCategory components
   - ✅ Pass to recursive svelte:self

4. **ListCategory.svelte changes:**
   - ✅ Add `categoryRefsMap` prop

5. **ParentIssuePresenter.svelte changes:**
   - ✅ Add `issue` prop to accept pre-fetched issue
   - ✅ Rename internal `issue` to `queriedIssue`
   - ✅ Add `actualIssue = issue ?? queriedIssue` logic
   - ✅ Only query if `issue` prop is undefined

6. **ListCategory.svelte changes:**
   - ✅ Pass `categoryRefsMap` to ListHeader

7. **ListHeader.svelte integration:**
   - ✅ Accept `categoryRefsMap` prop
   - ✅ Import `getCategoryReference` utility
   - ✅ Create reactive `categoryRefDoc` using getCategoryReference
   - ✅ Pass pre-fetched document to presenter via spread: `{...(categoryRefDoc ? { issue: categoryRefDoc, object: categoryRefDoc } : {})}`

**Key Improvement:** Now uses `createQuery()` instead of async function, making it fully reactive and automatically updating when docs change!

### 🚧 TODO: Extend to Other Presenters

1. **Update other presenters to accept pre-fetched objects:**
   - [ ] UserPresenter (for createdBy/modifiedBy) - Add `user` prop
   - [ ] MilestonePresenter (for milestone) - Add `milestone` prop
   - [ ] ComponentPresenter (for component) - Add `component` prop
   - [ ] SpacePresenter (for space) - Add `space` prop
   - [ ] Any other Ref-based presenters

**Pattern for each presenter:**
```typescript
// Add optional object prop
export let value: Ref<T> | undefined
export let object: T | undefined = undefined  // or named prop like 'issue', 'user', etc.

// Only query if object not provided
$: if (object === undefined && value !== undefined) {
  query.query(...)
} else {
  query.unsubscribe()
}

// Use provided or queried
$: actualObject = object ?? queriedObject
```

2. **Testing:**
   - [ ] Test with attachedTo grouping
   - [ ] Test with createdBy grouping
   - [ ] Test with milestone grouping
   - [ ] Verify queries reduced (check Network tab)

**Expected improvement:** Eliminates N presenter queries (where N = unique ref values)

---

## ⏳ Phase 2: Eliminate Redundant Category Queries (NOT STARTED)

**Goal:** Remove per-category queries, use docsMap

**Status:** Planned

**Changes needed:**
1. List.svelte - Create docsMap, remove RateLimiter
2. ListCategories.svelte - Pass docsMap
3. ListCategory.svelte - Remove createQuery(), use docsMap

**Expected improvement:** 5-10x faster rendering

See `performance-list.md` for detailed implementation plan.

---

## Current Performance Metrics

### Before Any Optimization:
- **Queries (25 categories):** 27 (2 + 25)
- **Queries (10 categories):** 12 (2 + 10)
- **Plus:** N presenter queries for referenced docs

### After Phase 0+1 (CURRENT STATE):
- **Initial queries (25 categories with attachedTo):** ~4-5 (only 20 shown, 1 bulk ref query)
- **ParentIssuePresenter queries:** 0 (pre-fetched via reactive query)
- **After "Show More":** Categories 21-25 appear instantly (data already loaded)
- **Other presenters:** Still query individually (need updates)

### After Phase 0+1+2 (target):
- **Queries (any # categories):** 2-3 total
- **Category expand:** Instant (no query)
- **Render time:** 5-10x faster

---

## Next Steps (Priority Order)

1. **Test Phase 0+1** (30 min - 1 hour) ⚡ PRIORITY
   - Test "Group by attachedTo" - should see NO individual ParentIssuePresenter queries
   - Verify bulk reference lookup query appears (reactive!)
   - Test with 25+ categories - only 20 should show initially
   - Click "Show More" - remaining categories appear instantly
   - Test with various Issue hierarchies

3. **Extend Phase 1 to other presenters** (1-2 hours each, optional)
   - Update UserPresenter (for createdBy/modifiedBy)
   - Update MilestonePresenter
   - Update ComponentPresenter
   - Test each after update

4. **Test Phase 0+1** (2 hours)
   - Measure query reduction
   - Verify all presenters work correctly
   - Test with various groupBy options

4. **Implement Phase 2** (1 day)
   - Follow detailed plan in performance-list.md
   - Remove RateLimiter
   - Use docsMap for category items

---

## Files Modified So Far

### ✅ Modified (Phase 0+1 Complete):
- `plugins/view-resources/src/utils.ts` - Added category reference utilities (isRefAttribute, getCategoryReference)
- `plugins/view-resources/src/index.ts` - Exported new functions
- `plugins/view-resources/src/components/list/List.svelte` - Added reactive categoryRefsMap with createQuery
- `plugins/view-resources/src/components/list/ListCategories.svelte` - Pass categoryRefsMap + ShowMore functionality
- `plugins/view-resources/src/components/list/ListCategory.svelte` - Accept and pass categoryRefsMap
- `plugins/view-resources/src/components/list/ListHeader.svelte` - Use categoryRefsMap to get pre-fetched docs
- `plugins/tracker-resources/src/components/issues/ParentIssuePresenter.svelte` - Accept pre-fetched issue

### 🚧 Need to modify (Optional - extend to other presenters):
- `plugins/contact-resources/src/components/UserPresenter.svelte` - Accept pre-fetched user
- `plugins/tracker-resources/src/components/milestones/MilestonePresenter.svelte` - Accept pre-fetched milestone
- `plugins/tracker-resources/src/components/components/ComponentPresenter.svelte` - Accept pre-fetched component
- Other Ref-based presenters as needed

---

## Testing Checklist

### Phase 0+1 Combined Testing:
- [ ] **Phase 0:** 25 categories - only 20 shown initially ⚡
- [ ] **Phase 0:** "Show More" button displays with count
- [ ] **Phase 0:** Click Show More - remaining 5 categories appear instantly
- [ ] **Phase 1:** Group by attachedTo - verify NO individual issue queries ⚡
- [ ] **Phase 1:** Check DevTools Network - should see 1 REACTIVE bulk query for parent issues
- [ ] **Phase 1:** Verify ParentIssuePresenter displays correctly without queries
- [ ] **Phase 1:** Test with empty/null references
- [ ] **Phase 1:** Test query reactivity - create new issue, verify bulk query updates
- [ ] Group by createdBy - verify bulk user query (individual queries until UserPresenter updated)
- [ ] Group by modifiedBy - verify bulk user query (individual queries until UserPresenter updated)
- [ ] Group by milestone - verify bulk milestone query (individual queries until MilestonePresenter updated)
- [ ] Group by component - verify bulk component query (individual queries until ComponentPresenter updated)

---

## Known Issues / Notes

1. **categoryRefsMap building:**
   - ✅ Now uses createQuery() for reactive updates
   - ✅ Automatically manages subscriptions (creates/updates/unsubscribes)
   - ✅ Fully reactive - updates when docs change

2. **Presenter updates:**
   - Each presenter needs individual update
   - Pattern is same: add optional object prop, skip query if provided
   - Should be consistent across all Ref-based presenters

3. **Type safety:**
   - getCategoryReference returns Doc | undefined
   - Presenters should handle undefined gracefully
   - TypeScript should catch mismatches

---

## References

- **Detailed analysis:** `performance-list.md`
- **Original issue:** List views slow with many categories
- **Root cause:** N+2+M redundant queries
- **Solution:** 3-phase optimization approach
