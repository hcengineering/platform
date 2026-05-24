//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Shared utilities for the admin-users / admin-workspaces components.
//
import { AccountRole } from '@hcengineering/core'

/**
 * Coerce a DropdownIntlItem.id (typed as `string` after round-trip
 * through the dropdown component) back to the numeric AccountRole enum.
 * Several callsites forgot `Number(...)` and silently shipped `"4"`
 * to the backend instead of the integer 4.
 */
export function parseRole (v: unknown): AccountRole {
  return Number(v) as AccountRole
}
