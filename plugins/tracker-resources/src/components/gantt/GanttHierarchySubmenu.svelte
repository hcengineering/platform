<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { type Issue } from '@hcengineering/tracker'
  import { type Action as UiAction, Menu, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'
  import SetParentIssueActionPopup from '../SetParentIssueActionPopup.svelte'
  import LinkSubIssueActionPopup from '../LinkSubIssueActionPopup.svelte'

  /**
   * Gantt context-menu Hierarchy ▸ submenu. Renders the parent/sub-issue
   * actions inside Huly's standard Menu component so the popup matches the
   * surrounding right-click look (separator lines, icons, keyboard nav).
   *
   * Three entries:
   * - Set parent issue…              → existing SetParentIssueActionPopup
   * - Add sub-issue                  → existing CreateIssue (with parentIssue)
   * - Link existing as sub-issue…    → new LinkSubIssueActionPopup (inverted parent-picker)
   *
   * The two top-level actions on the auto-resolved Issue action list
   * (`tracker:action:SetParent`, `tracker:action:NewSubIssue`) are hidden from
   * the parent Gantt menu via excludedActions so this submenu is the single
   * source of truth for hierarchy edits in the Gantt right-click.
   */
  export let issue: Issue

  const dispatch = createEventDispatcher()

  const actions: UiAction[] = [
    {
      label: tracker.string.SetParentIssueLabel,
      icon: tracker.icon.Parent,
      group: 'associate',
      action: async () => {
        dispatch('close')
        showPopup(SetParentIssueActionPopup, { value: issue }, 'top')
      }
    },
    {
      label: tracker.string.NewSubIssue,
      icon: tracker.icon.Subissue,
      group: 'associate',
      action: async () => {
        dispatch('close')
        showPopup(
          CreateIssue,
          { space: issue.space, parentIssue: issue, shouldSaveDraft: true },
          'top'
        )
      }
    },
    {
      label: tracker.string.LinkExistingSubIssue,
      icon: tracker.icon.Subissue,
      group: 'associate',
      action: async () => {
        dispatch('close')
        showPopup(LinkSubIssueActionPopup, { value: issue }, 'top')
      }
    }
  ]
</script>

<Menu {actions} on:close />
