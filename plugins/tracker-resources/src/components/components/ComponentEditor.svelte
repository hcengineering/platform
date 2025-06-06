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
  import { AttachedData, DocumentQuery, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { RuleApplyResult, getClient, getDocRules } from '@hcengineering/presentation'
  import { Component, Issue, IssueTemplate, Project, TrackerEvents } from '@hcengineering/tracker'
  import { ButtonKind, ButtonShape, ButtonSize, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { createEventDispatcher, afterUpdate } from 'svelte'
  import { Analytics } from '@hcengineering/analytics'

  import { activeComponent } from '../../issues'
  import tracker from '../../plugin'
  import ComponentSelector from './ComponentSelector.svelte'

  export let value: Issue | Issue[] | IssueTemplate | AttachedData<Issue>
  export let isEditable: boolean = true
  // export let shouldShowLabel: boolean = true
  export let popupPlaceholder: IntlString = tracker.string.MoveToComponent
  export let shouldShowPlaceholder = true
  export let size: ButtonSize = 'large'
  export let kind: ButtonKind = 'link'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  // export let onlyIcon: boolean = false
  export let isAction: boolean = false
  export let groupBy: string | undefined = undefined
  export let enlargedText: boolean = false
  export let compression: boolean = false
  // export let shrink: number = 0
  export let space: Ref<Project> | undefined = undefined

  const client = getClient()

  const dispatch = createEventDispatcher()

  let element: HTMLDivElement

  const handleComponentIdChanged = async (newComponentId: Ref<Component> | null | undefined) => {
    if (!isEditable || newComponentId === undefined || (!Array.isArray(value) && value.component === newComponentId)) {
      return
    }

    if (Array.isArray(value)) {
      await Promise.all(
        value.map(async (p) => {
          if ('_class' in p) {
            Analytics.handleEvent(TrackerEvents.IssueComponentAdded, {
              issue: p.identifier ?? p._id,
              component: newComponentId
            })
            await client.update(p, { component: newComponentId })
          }
        })
      )
    } else {
      if ('_class' in value) {
        Analytics.handleEvent(TrackerEvents.IssueComponentAdded, {
          issue: (value as Issue).identifier ?? value._id,
          component: newComponentId
        })
        await client.update(value, { component: newComponentId })
      }
    }
    dispatch('change', newComponentId)
    if (isAction) dispatch('close')
  }

  $: _space =
    space ??
    (Array.isArray(value)
      ? { $in: Array.from(new Set(value.map((it) => it.space))) }
      : 'space' in value
        ? value.space
        : undefined)
  $: twoRows = $deviceInfo.twoRows

  let rulesQuery: RuleApplyResult<Component> | undefined
  let query: DocumentQuery<Component>
  $: if (Array.isArray(value) || '_id' in value) {
    rulesQuery = getDocRules<Component>(value, 'component')
    if (rulesQuery !== undefined) {
      query = { ...(rulesQuery?.fieldQuery ?? {}) }
    } else {
      query = { _id: 'none' as Ref<Component> }
      rulesQuery = {
        disableEdit: true,
        disableUnset: true,
        fieldQuery: {}
      }
    }
  }

  afterUpdate(() => dispatch('resize', element?.clientWidth))
</script>

{#if kind === 'list'}
  {#if !Array.isArray(value) && value.component}
    <div bind:this={element} class={compression ? 'label-wrapper' : 'clear-mins'}>
      <ComponentSelector
        {kind}
        {size}
        {shape}
        {justify}
        isEditable={isEditable && !rulesQuery?.disableEdit}
        isAllowUnset={!rulesQuery?.disableUnset}
        {popupPlaceholder}
        {query}
        space={_space}
        {enlargedText}
        short={compression}
        showTooltip={{ label: value.component ? tracker.string.MoveToComponent : tracker.string.AddToComponent }}
        value={value.component}
        onChange={handleComponentIdChanged}
        {isAction}
      />
    </div>
  {/if}
{:else}
  <div
    bind:this={element}
    class="flex flex-wrap clear-mins"
    class:minus-margin={kind === 'list-header'}
    class:label-wrapper={compression}
    style:flex-direction={twoRows ? 'column' : 'row'}
  >
    {#if (!Array.isArray(value) && value.component && value.component !== $activeComponent && groupBy !== 'component') || shouldShowPlaceholder}
      <div class="flex-row-center" class:minus-margin-vSpace={kind === 'list-header'} class:compression style:width>
        <ComponentSelector
          {kind}
          {size}
          {shape}
          {width}
          {justify}
          isEditable={isEditable && !rulesQuery?.disableEdit}
          isAllowUnset={!rulesQuery?.disableUnset}
          {popupPlaceholder}
          {enlargedText}
          {query}
          space={_space}
          showTooltip={{
            label:
              !Array.isArray(value) && value.component ? tracker.string.MoveToComponent : tracker.string.AddToComponent
          }}
          value={!Array.isArray(value) ? value.component : undefined}
          onChange={handleComponentIdChanged}
          {isAction}
        />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .minus-margin {
    margin-left: -0.5rem;
    &-vSpace {
      margin: -0.25rem 0;
    }
  }
</style>
