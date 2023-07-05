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
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Milestone } from '@hcengineering/tracker'
  import {
    ButtonKind,
    DatePresenter,
    deviceOptionsStore as deviceInfo,
    getPlatformAvatarColorDef,
    getPlatformAvatarColorForTextDef,
    themeStore
  } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'
  import MilestoneSelector from './MilestoneSelector.svelte'

  export let value: Ref<Milestone>
  export let kind: ButtonKind = 'link'
  export let display: 'kanban' | 'list' | undefined = undefined

  const milestoneQuery = createQuery()
  let milestone: Milestone | undefined
  $: milestoneQuery.query(tracker.class.Milestone, { _id: value }, (res) => {
    ;[milestone] = res
  })

  $: twoRows = $deviceInfo.twoRows

  const dispatch = createEventDispatcher()
  $: accentColor =
    milestone?.label !== undefined
      ? getPlatformAvatarColorForTextDef(milestone?.label, $themeStore.dark)
      : getPlatformAvatarColorDef(0, $themeStore.dark)

  $: dispatch('accent-color', accentColor)
  onMount(() => {
    dispatch('accent-color', accentColor)
  })
</script>

<div
  class="flex flex-wrap"
  class:minus-margin={kind === 'list-header'}
  style:flex-direction={twoRows ? 'column' : 'row'}
>
  <div class="flex-row-center" class:minus-margin-vSpace={kind === 'list-header'}>
    <MilestoneSelector {kind} isEditable={false} enlargedText {value} />
  </div>

  {#if milestone && kind === 'list-header' && display !== 'kanban'}
    <div class="flex-row-center" class:minus-margin-space={kind === 'list-header'} class:text-sm={twoRows}>
      {#if milestone}
        <DatePresenter value={milestone.targetDate} kind={'ghost'} />
      {/if}
    </div>
  {/if}
</div>
