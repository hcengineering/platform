//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Action as UiAction, PopupAlignment } from '@hcengineering/ui'
import { DatePopup, showPopup } from '@hcengineering/ui'
import Calendar from '@hcengineering/ui/src/components/icons/Calendar.svelte'
import { getClient } from '@hcengineering/presentation'
import type { Timestamp } from '@hcengineering/core'
import tracker from '../../../plugin'
import { snapToUtcMidnight } from './time-scale'

const DAY_MS = 86_400_000

/**
 * Open Huly's DatePopup against the issue's startDate. On confirm, write the
 * snapped value back via updateDoc. If both dates are null and the user picks
 * a start, auto-fill dueDate = start + 1 day so the bar becomes visible on
 * the canvas immediately (parent-spec §8.0 date-only semantics).
 *
 * Callback shape: DatePopup dispatches `close` with `{ value: Date | null }`,
 * so the showPopup result handler receives `{ value: Date | null } | undefined`.
 * `undefined` means dismissed; `value === null` means the user pressed Clear.
 * Verified against packages/ui/src/components/calendar/DatePopup.svelte:72
 * (`dispatch('close', { value: currentDate })`) and the existing
 * DateEditor.svelte usage in plugins/calendar-resources.
 *
 * `tracker.action.SetDueDate` is already registered as a model action and is
 * surfaced by Menu.svelte's auto-resolution; we do not add a local twin here.
 */
export function openSetStartDate (issue: Issue, anchor: PopupAlignment | undefined): void {
  const client = getClient()
  showPopup(
    DatePopup,
    {
      currentDate: issue.startDate != null ? new Date(issue.startDate) : null,
      withTime: false,
      label: tracker.string.SetStartDate
    },
    anchor,
    (result: { value: Date | null } | undefined) => {
      if (result === undefined) return // dismissed
      const picked = result.value
      const newStart: Timestamp | null = picked === null ? null : snapToUtcMidnight(picked.getTime())
      const patch: { startDate: Timestamp | null, dueDate?: Timestamp | null } = { startDate: newStart }
      // Auto-fill due-date when both were null and the user is scheduling for the first time.
      if (newStart !== null && issue.startDate == null && issue.dueDate == null) {
        patch.dueDate = newStart + DAY_MS
      }
      void client.updateDoc(issue._class, issue.space, issue._id, patch)
    }
  )
}

/**
 * Local-only ui.Action list appended to the Gantt context menu. Right now
 * this is a single "Set start date" entry; "Set due date" is handled by the
 * existing tracker.action.SetDueDate model action, which Menu.svelte
 * resolves automatically.
 *
 * The anchor closure is passed in by the caller because at action-invocation
 * time the original MouseEvent is no longer reachable — `Menu.svelte` calls
 * `action(props, evt)` where `evt` is the menu-item click, not the original
 * right-click. The Gantt context-menu trigger captures the right-click
 * position via getEventPositionElement(ev) and passes it through.
 */
export function ganttExtraActions (issue: Issue, anchor: PopupAlignment | undefined): UiAction[] {
  return [
    {
      label: tracker.string.SetStartDate,
      icon: Calendar,
      group: 'edit',
      action: async () => {
        openSetStartDate(issue, anchor)
      }
    }
  ]
}
