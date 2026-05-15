//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Action as UiAction, PopupAlignment } from '@hcengineering/ui'
import { DatePopup, NotificationSeverity, addNotification, showPopup } from '@hcengineering/ui'
import Calendar from '@hcengineering/ui/src/components/icons/Calendar.svelte'
import { getClient } from '@hcengineering/presentation'
import { translate } from '@hcengineering/platform'
import type { Timestamp } from '@hcengineering/core'
import tracker from '../../../plugin'
import { snapToUtcMidnight } from './time-scale'
import GanttHierarchySubmenu from '../GanttHierarchySubmenu.svelte'

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
      // Surface failures (permission denied, validation, conflict) the same
      // way commitDrag does so the user gets
      // visible feedback instead of a silent fire-and-forget.
      client.updateDoc(issue._class, issue.space, issue._id, patch).catch(async (err) => {
        const title = await translate(tracker.string.GanttDragFailed, {}, undefined)
        addNotification(title, String(err), undefined as any, undefined, NotificationSeverity.Error)
      })
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
    },
    {
      // Hierarchy ▸ submenu: combines SetParent, Add sub-issue, Link existing
      // as sub-issue into one Gantt entry. The two existing model actions
      // (tracker:action:SetParent, tracker:action:NewSubIssue) are excluded
      // from the parent menu via GANTT_MENU_EXCLUDED_ACTIONS in GanttView.
      // `action` is required by the ui.Action interface but is a no-op for
      // submenu entries — Menu.svelte routes the click to `component` when
      // present (showActionPopup at packages/ui/src/components/Menu.svelte:82).
      label: tracker.string.Hierarchy,
      icon: tracker.icon.Parent,
      group: 'associate',
      action: async () => { /* submenu — handled by component */ },
      component: GanttHierarchySubmenu,
      props: { issue }
    }
  ]
}
