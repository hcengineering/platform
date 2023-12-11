<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Ref, Status } from '@hcengineering/core'
  import { Project } from '@hcengineering/task'
  import StateIconPresenter from './StateIconPresenter.svelte'

  export let value: Status | undefined
  export let shouldShowAvatar = true
  export let inline: boolean = false
  export let disabled: boolean = false
  export let oneLine: boolean = false
  export let shouldShowName: boolean = true
  export let shouldShowTooltip: boolean = false
  export let noUnderline: boolean = false
  export let accent: boolean = false
  export let shrink: number = 0
  export let space: Ref<Project>
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="flex-presenter"
    class:inline-presenter={inline}
    class:flex-no-shrink={!shouldShowName || shrink === 0}
    class:fs-bold={accent}
    on:click
  >
    {#if shouldShowAvatar}
      <div class:mr-2={shouldShowName}>
        <StateIconPresenter {value} {shouldShowTooltip} {space} />
      </div>
    {/if}
    {#if shouldShowName}
      <span class="overflow-label label" class:nowrap={oneLine} class:no-underline={noUnderline || disabled}>
        {value.name}
      </span>
    {/if}
  </div>
{/if}
