//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Shared utilities for the admin-users / admin-workspaces components.
//
import { AccountRole } from '@hcengineering/core'
import { getEmbeddedLabel } from '@hcengineering/platform'
import { MessageBox } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'

/**
 * Coerce a DropdownIntlItem.id (typed as `string` after round-trip
 * through the dropdown component) back to the numeric AccountRole enum.
 * Several callsites forgot `Number(...)` and silently shipped `"4"`
 * to the backend instead of the integer 4.
 */
export function parseRole (v: unknown): AccountRole {
  return Number(v) as AccountRole
}

/**
 * Show a confirm dialog. Used by both the bulk-action bar (AdminUsers)
 * and per-row drawer actions (AdminUsersDrawer). Dangerous flag
 * styles the confirm button red.
 */
export function confirmAction (
  title: string,
  message: string,
  dangerous: boolean,
  action: () => Promise<void>
): void {
  showPopup(MessageBox, {
    label: getEmbeddedLabel(title),
    message: getEmbeddedLabel(message),
    okLabel: getEmbeddedLabel('Confirm'),
    dangerous,
    action
  })
}

/**
 * Show an info popup. Dangerous flag tints the dismiss button red
 * (used for error notifications).
 */
export function notify (title: string, message: string, dangerous = false): void {
  showPopup(MessageBox, {
    label: getEmbeddedLabel(title),
    message: getEmbeddedLabel(message),
    okLabel: getEmbeddedLabel('OK'),
    dangerous,
    canSubmit: true
  })
}
