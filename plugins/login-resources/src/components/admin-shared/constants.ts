//
// Copyright © 2026 Hardcore Engineering Inc.
//

/**
 * Debounce delay for admin search / filter inputs. Used by GlobalSearch,
 * AdminUsers search bar, and any future debounced admin input. Tuned to
 * keep typing responsive while avoiding a hit per keystroke against
 * /api/v1/admin/list.
 */
export const DEBOUNCE_MS = 300
