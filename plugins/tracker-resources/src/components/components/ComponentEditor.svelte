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
  import { AttachedData, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Component, Issue, IssueTemplate, Project } from '@hcengineering/tracker'
  import { ButtonKind, ButtonShape, ButtonSize, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { activeComponent } from '../../issues'
  import tracker from '../../plugin'
  import ComponentSelector from '../ComponentSelector.svelte'

  export let value: Issue | IssueTemplate | AttachedData<Issue>
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = true
  export let popupPlaceholder: IntlString = tracker.string.MoveToComponent
  export let shouldShowPlaceholder = true
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  export let onlyIcon: boolean = false
  export let groupBy: string | undefined = undefined
  export let enlargedText = false
  export let compression: boolean = false
  export let shrink: number = 0
  export let space: Ref<Project> | undefined = undefined

  const client = getClient()

  const dispatch = createEventDispatcher()

  const handleComponentIdChanged = async (newComponentId: Ref<Component> | null | undefined) => {
    if (!isEditable || newComponentId === undefined || value.component === newComponentId) {
      return
    }
    dispatch('change', newComponentId)
    if ('_class' in value) {
      await client.update(value, { component: newComponentId })
    }
  }

  $: _space = space ?? ('space' in value ? value.space : undefined)
</script>

{#if (value.component && value.component !== $activeComponent && groupBy !== 'component') || shouldShowPlaceholder}
  <div
    class={compression ? 'label-wrapper' : 'clear-mins'}
    class:minus-margin={kind === 'list-header'}
    use:tooltip={{ label: value.component ? tracker.string.MoveToComponent : tracker.string.AddToComponent }}
  >
    <ComponentSelector
      {kind}
      {size}
      {shape}
      {width}
      {justify}
      {isEditable}
      {shouldShowLabel}
      {popupPlaceholder}
      {onlyIcon}
      {enlargedText}
      {shrink}
      space={_space}
      value={value.component}
      short={compression}
      onChange={handleComponentIdChanged}
    />
  </div>
{/if}

<style lang="scss">
  .minus-margin {
    margin-left: -0.5rem;
  }
</style>
