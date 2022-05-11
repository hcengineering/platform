<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Ref, WithLookup } from '@anticrm/core'

  import { IssueStatus } from '@anticrm/tracker'
  import { Button, showPopup, SelectPopup, eventToHTMLElement } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'
  import tracker from '../plugin'

  export let selectedStatusId: Ref<IssueStatus>
  export let statuses: WithLookup<IssueStatus>[]
  export let shouldShowLabel: boolean = true
  export let onStatusChange: ((newStatus: Ref<IssueStatus> | undefined) => void) | undefined = undefined
  export let isEditable: boolean = true

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'

  $: selectedStatus = statuses.find((status) => status._id === selectedStatusId) ?? statuses[0]
  $: selectedStatusIcon = selectedStatus?.$lookup?.category?.icon
  $: selectedStatusLabel = shouldShowLabel ? selectedStatus?.name : undefined
  $: statusesInfo = statuses.map((s) => ({ id: s._id, text: s.name, color: s.color, icon: s.$lookup?.category?.icon }))

  const handleStatusEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus, searchable: true },
      eventToHTMLElement(event),
      onStatusChange
    )
  }
</script>

<Button
  icon={selectedStatusIcon}
  {justify}
  {width}
  {size}
  {kind}
  disabled={!isEditable}
  on:click={handleStatusEditorOpened}
>
  <svelte:fragment slot="content">
    {#if selectedStatusLabel}
      <span class="nowrap">{selectedStatusLabel}</span>
    {/if}
  </svelte:fragment>
</Button>
