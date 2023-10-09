<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, IssueTemplate, Milestone, Project } from '@hcengineering/tracker'
  import {
    ButtonKind,
    ButtonShape,
    ButtonSize,
    DatePresenter,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { activeMilestone } from '../../issues'
  import tracker from '../../plugin'
  import MilestoneSelector from './MilestoneSelector.svelte'

  export let value: Issue | Issue[] | IssueTemplate
  export let space: Ref<Project> | undefined = undefined
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = true
  export let popupPlaceholder: IntlString = tracker.string.MoveToMilestone
  export let shouldShowPlaceholder = true
  export let size: ButtonSize = 'large'
  export let kind: ButtonKind = 'link'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  export let onlyIcon: boolean = false
  export let isAction: boolean = false

  export let groupBy: string | undefined = undefined
  export let enlargedText: boolean = false
  export let compression: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  const handleMilestoneIdChanged = async (newMilestoneId: Ref<Milestone> | null | undefined) => {
    if (!isEditable || newMilestoneId === undefined || (!Array.isArray(value) && value.milestone === newMilestoneId)) {
      return
    }
    if (Array.isArray(value)) {
      await Promise.all(
        value.map(async (p) => {
          await client.update(p, { milestone: newMilestoneId })
        })
      )
    } else {
      await client.update(value, { milestone: newMilestoneId })
    }
    if (isAction) dispatch('close')
  }

  const milestoneQuery = createQuery()
  let milestone: Milestone | undefined
  $: if (!Array.isArray(value) && value.milestone) {
    milestoneQuery.query(tracker.class.Milestone, { _id: value.milestone }, (res) => {
      milestone = res.shift()
    })
  }

  $: _space = space ?? (!Array.isArray(value) ? value.space : { $in: Array.from(new Set(value.map((it) => it.space))) })

  $: twoRows = $deviceInfo.twoRows
</script>

{#if kind === 'list'}
  {#if !Array.isArray(value) && value.milestone}
    <div class={compression ? 'label-wrapper' : 'clear-mins'}>
      <MilestoneSelector
        {kind}
        {size}
        {shape}
        {justify}
        {isEditable}
        {shouldShowLabel}
        {popupPlaceholder}
        {onlyIcon}
        {enlargedText}
        space={_space}
        short={compression}
        showTooltip={{ label: value.milestone ? tracker.string.MoveToMilestone : tracker.string.AddToMilestone }}
        value={value.milestone}
        onChange={handleMilestoneIdChanged}
        {isAction}
      />
    </div>
  {/if}
{:else}
  <div
    class="flex flex-wrap clear-mins"
    class:minus-margin={kind === 'list-header'}
    class:label-wrapper={compression}
    style:flex-direction={twoRows ? 'column' : 'row'}
  >
    {#if (!Array.isArray(value) && value.milestone && value.milestone !== $activeMilestone && groupBy !== 'milestone') || shouldShowPlaceholder}
      <div class="flex-row-center" class:minus-margin-vSpace={kind === 'list-header'} class:compression style:width>
        <MilestoneSelector
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
          space={_space}
          showTooltip={{
            label:
              !Array.isArray(value) && value.milestone ? tracker.string.MoveToMilestone : tracker.string.AddToMilestone
          }}
          value={!Array.isArray(value) ? value.milestone : undefined}
          onChange={handleMilestoneIdChanged}
          {isAction}
        />
      </div>
    {/if}

    {#if milestone && kind === 'list-header'}
      <div class="flex-row-center" class:minus-margin-space={kind === 'list-header'} class:text-sm={twoRows}>
        {#if milestone}
          <DatePresenter value={milestone.targetDate} kind={'ghost'} />
        {/if}
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
    &-space {
      margin: -0.25rem 0 -0.25rem 0.5rem;
    }
  }
</style>
