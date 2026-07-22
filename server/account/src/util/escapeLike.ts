//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Escape the LIKE/ILIKE wildcards (% and _) and the escape character (\)
// in a user-supplied substring so callers can interpolate it directly
// inside `'%' + escapeLike(needle) + '%'` patterns without accidentally
// granting wildcard semantics. Pair every ILIKE that uses this helper
// with `ESCAPE '\'` so PostgreSQL treats the doubled-up backslash
// sequence as a literal.
//
// Without this, a user typing `%` in the admin-panel search box turns
// the predicate into an unconstrained `%%...%%` match — effectively
// disabling the filter — and `_` matches a single arbitrary character.
//
export function escapeLike (s: string): string {
  return s.replace(/[\\%_]/g, '\\$&')
}
