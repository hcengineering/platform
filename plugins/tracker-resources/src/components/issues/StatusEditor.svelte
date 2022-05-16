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
  import { Issue, IssueStatus } from '@anticrm/tracker'
  import { getClient } from '@anticrm/presentation'
  import { Tooltip } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'
  import tracker from '../../plugin'
  import StatusSelector from '../StatusSelector.svelte'
  import { createEventDispatcher } from 'svelte'

  export let value: Issue
  export let statuses: WithLookup<IssueStatus>[]
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false
  export let shouldSaveOnChange = true

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'

  const client = getClient()
  const dispatch = createEventDispatcher()

  const handleStatusChanged = async (newStatus: Ref<IssueStatus> | undefined) => {
    if (!isEditable || newStatus === undefined || value.status === newStatus) {
      return
    }

    dispatch('change', newStatus)

    if (shouldSaveOnChange) {
      await client.update(value, { status: newStatus })
    }
}
</script>

{#if value}
  {#if isEditable}
    <Tooltip label={tracker.string.SetStatus} fill>
      <StatusSelector
        {kind}
        {size}
        {width}
        {justify}
        {isEditable}
        {shouldShowLabel}
        {statuses}
        selectedStatusId={value.status}
        onStatusChange={handleStatusChanged}
      />
    </Tooltip>
  {:else}
    <StatusSelector
      {kind}
      {size}
      {width}
      {justify}
      {isEditable}
      {shouldShowLabel}
      {statuses}
      selectedStatusId={value.status}
      onStatusChange={handleStatusChanged}
    />
  {/if}
{/if}
