<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Data } from '@hcengineering/core'
  import { Milestone } from '@hcengineering/tracker'
  import { getClient } from '@hcengineering/presentation'
  import { Button, ButtonKind, ButtonSize, Icon, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { defaultMilestoneStatuses, milestoneStatusAssets } from '../../utils'
  import tracker from '../../plugin'

  export let value: Milestone['status'] | undefined
  export let object: Milestone | Data<Milestone>
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined
  export let disabled = false

  const dispatch = createEventDispatcher()
  const client = getClient()

  function handlePopupOpen (event: MouseEvent) {
    showPopup(
      SelectPopup,
      { value: itemsInfo, placeholder: tracker.string.SetStatus },
      eventToHTMLElement(event),
      changeStatus
    )
  }

  async function changeStatus (newStatus: Milestone['status'] | null | undefined) {
    if (disabled || newStatus == null || value === newStatus) {
      return
    }

    value = newStatus
    dispatch('change', value)

    if ('_id' in object) {
      await client.update(object, { status: newStatus })
    }
  }

  $: itemsInfo = defaultMilestoneStatuses.map((status) => ({
    id: status,
    isSelected: value === status,
    ...milestoneStatusAssets[status]
  }))

  $: icon = value === undefined ? tracker.icon.MilestoneStatusPlanned : milestoneStatusAssets[value].icon
  $: label = value === undefined ? tracker.string.Planned : milestoneStatusAssets[value].label
</script>

{#if kind === 'list'}
  <button
    class="flex-no-shrink clear-mins cursor-pointer content-pointer-events-none"
    {disabled}
    on:click={handlePopupOpen}
  >
    <Icon {icon} {size} />
  </button>
{:else}
  <Button
    {label}
    {kind}
    {icon}
    {justify}
    {size}
    {width}
    {disabled}
    showTooltip={{ label: tracker.string.SetStatus }}
    on:click={handlePopupOpen}
  />
{/if}
