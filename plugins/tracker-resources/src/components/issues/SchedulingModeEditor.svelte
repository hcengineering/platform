<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<!--
  Tier-2 Item 5 — Auto-Scheduling-Toggle.

  Per-issue toggle between cascade-driven scheduling (`'auto'`, the default)
  and user-pinned scheduling (`'manual'`). The pin is reset *only* by an
  explicit click back to Auto — moving a predecessor never re-arms cascade.

  Mounted in `ControlPanel.svelte` next to Start- and Due-Date, mirroring the
  Priority/Status editor pattern (small Button with link kind + leading icon).

  The Manual decision propagates through `gantt/lib/scheduler.ts` (Step 4
  BFS filter) and `GanttBar.svelte` (pin glyph), both wired in the same
  commit-stack as this editor.
-->
<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import type { Issue } from '@hcengineering/tracker'
  import { Button, Icon, type ButtonKind, type ButtonSize } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import tracker from '../../plugin'

  export let value: Issue
  export let editable: boolean = true
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let width: string | undefined = undefined

  const client = getClient()

  // `undefined` means the field has never been set — treat as 'auto' so
  // the UI is honest about the effective behaviour. Toggle writes either
  // 'auto' or 'manual' explicitly.
  $: effectiveMode = value.schedulingMode === 'manual' ? 'manual' : 'auto'
  $: labelId = effectiveMode === 'manual' ? tracker.string.SchedulingModeManual : tracker.string.SchedulingModeAuto
  $: tooltipId =
    effectiveMode === 'manual'
      ? tracker.string.SchedulingModeTooltipManual
      : tracker.string.SchedulingModeTooltipAuto

  async function toggle (): Promise<void> {
    if (!editable) return
    const next: 'auto' | 'manual' = effectiveMode === 'manual' ? 'auto' : 'manual'
    await client.updateCollection(
      value._class,
      value.space,
      value._id,
      value.attachedTo,
      value.attachedToClass,
      value.collection,
      { schedulingMode: next }
    )
  }
</script>

<Button
  {kind}
  {size}
  {width}
  disabled={!editable}
  label={labelId}
  showTooltip={{ label: tooltipId }}
  on:click={toggle}
>
  <svelte:fragment slot="icon">
    <Icon
      icon={view.icon.Pin}
      size="small"
      fill={effectiveMode === 'manual' ? 'var(--theme-state-info-color)' : 'currentColor'}
    />
  </svelte:fragment>
</Button>
