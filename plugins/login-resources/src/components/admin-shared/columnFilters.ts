//
// Copyright © 2026 Hardcore Engineering Inc.
//

// Merge a map of per-column filter partials into a single payload.
// Each value is spread; later keys win on collision; null/undefined
// entries (cleared filters) are skipped. Pure function — tested in
// __tests__/columnFilters.test.ts.
export function mergeColumnFilters (cf: Record<string, any>): Record<string, any> {
  return Object.values(cf).reduce<Record<string, any>>((acc, partial) => {
    if (partial == null) return acc
    return { ...acc, ...partial }
  }, {})
}
