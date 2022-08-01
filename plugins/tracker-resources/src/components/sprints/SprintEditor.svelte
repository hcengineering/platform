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
  import { Ref } from '@anticrm/core'
  import { Issue, Sprint } from '@anticrm/tracker'
  import { getClient } from '@anticrm/presentation'
  import { ButtonKind, ButtonShape, ButtonSize, tooltip } from '@anticrm/ui'
  import { IntlString } from '@anticrm/platform'
  import tracker from '../../plugin'
  import SprintSelector from './SprintSelector.svelte'

  export let value: Issue
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = true
  export let popupPlaceholder: IntlString = tracker.string.MoveToSprint
  export let shouldShowPlaceholder = true
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  export let onlyIcon: boolean = false

  const client = getClient()

  const handleSprintIdChanged = async (newSprintId: Ref<Sprint> | null | undefined) => {
    if (!isEditable || newSprintId === undefined || value.sprint === newSprintId) {
      return
    }

    await client.updateCollection(
      value._class,
      value.space,
      value._id,
      value.attachedTo,
      value.attachedToClass,
      value.collection,
      { sprint: newSprintId }
    )
  }
</script>

{#if value.sprint || shouldShowPlaceholder}
  <div
    class="clear-mins"
    use:tooltip={{ label: value.sprint ? tracker.string.MoveToSprint : tracker.string.AddToSprint }}
  >
    <SprintSelector
      {kind}
      {size}
      {shape}
      {width}
      {justify}
      {isEditable}
      {shouldShowLabel}
      {popupPlaceholder}
      {onlyIcon}
      value={value.sprint}
      onSprintIdChange={handleSprintIdChanged}
    />
  </div>
{/if}
