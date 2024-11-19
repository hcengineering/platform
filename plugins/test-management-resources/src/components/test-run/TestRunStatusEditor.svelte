<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { TestRunItem } from '@hcengineering/test-management'
  import { getClient } from '@hcengineering/presentation'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    Icon,
    SelectPopup,
    eventToHTMLElement,
    showPopup,
    Label
  } from '@hcengineering/ui'
  import { defaultTestRunStatuses, testRunStatusAssets } from '../../types'
  import testManagement from '../../plugin'

  export let value: TestRunItem['status'] | undefined
  export let object: TestRunItem | Data<TestRunItem>
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined
  export let disabled = false
  export let shouldShowAvatar: boolean = true
  export let accent: boolean = false

  const dispatch = createEventDispatcher()
  const client = getClient()

  function handlePopupOpen (event: MouseEvent) {
    showPopup(
      SelectPopup,
      { value: itemsInfo, placeholder: testManagement.string.SetStatus },
      eventToHTMLElement(event),
      changeStatus
    )
  }

  async function changeStatus (newStatus: TestRunItem['status'] | null | undefined) {
    if (disabled || newStatus == null || value === newStatus) {
      return
    }

    value = newStatus
    dispatch('change', value)

    if (object !== undefined && '_id' in object) {
      await client.update(object, { status: newStatus })
    }
  }

  $: itemsInfo = defaultTestRunStatuses.map((status) => ({
    id: status,
    isSelected: value === status,
    ...testRunStatusAssets[status]
  }))

  $: icon = value === undefined ? testManagement.icon.StatusNonTested : testRunStatusAssets[value].icon
  $: label = value === undefined ? testManagement.string.StatusNonTested : testRunStatusAssets[value].label
</script>

{#if kind === 'list'}
  <button
    class="flex-no-shrink clear-mins cursor-pointer content-pointer-events-none"
    {disabled}
    on:click={handlePopupOpen}
  >
    <Icon {icon} {size} />
  </button>
{:else if kind === 'list-header'}
  <div class="flex-row-center pl-0-5">
    {#if shouldShowAvatar}
      <Icon {icon} {size} />
    {/if}
    <span class="overflow-label" class:ml-1-5={shouldShowAvatar} class:fs-bold={accent}><Label {label} /></span>
  </div>
{:else}
  <Button
    {label}
    {kind}
    {icon}
    {justify}
    {size}
    {width}
    {disabled}
    showTooltip={{ label: testManagement.string.SetStatus }}
    on:click={handlePopupOpen}
  />
{/if}
