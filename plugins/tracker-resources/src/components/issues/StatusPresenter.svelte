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
  import { Ref } from '@hcengineering/core'
  import { ColorDefinition } from '@hcengineering/ui'
  import { IssueStatus, Project } from '@hcengineering/tracker'
  import IssueStatusIcon from './IssueStatusIcon.svelte'
  import { ProjectType, TaskType } from '@hcengineering/task'

  export let value: IssueStatus | undefined
  export let space: Ref<Project> | undefined = undefined
  export let projectType: Ref<ProjectType> | undefined = undefined
  export let taskType: Ref<TaskType> | undefined = undefined
  export let size: 'small' | 'medium' = 'small'
  export let kind: 'list-header' | 'table-attrs' | undefined = undefined
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let inline: boolean = false
  export let shouldShowAvatar: boolean = true

  let accentedColor: ColorDefinition | undefined
</script>

{#if value}
  {#if kind === 'table-attrs'}
    <button class="hulyTableAttr-content__row-icon-wrapper" on:click>
      <IssueStatusIcon
        {value}
        {size}
        {space}
        {projectType}
        {taskType}
        on:accent-color={(event) => {
          if (event.detail) accentedColor = event.detail
        }}
      />
    </button>
    <span
      class="hulyTableAttr-content__row-label font-medium-12 uppercase grow overflow-label"
      style:color={accentedColor?.color ?? 'var(--global-primary-TextColor)'}
    >
      {value.name}
    </span>
  {:else}
    <div class="flex-presenter" style:color={'inherit'}>
      {#if !inline && shouldShowAvatar}
        <IssueStatusIcon {value} {size} {space} on:accent-color {projectType} {taskType} />
      {/if}
      <span
        class="overflow-label"
        class:ml-2={!inline && shouldShowAvatar}
        class:list-header={kind === 'list-header'}
        class:colorInherit
        class:fs-bold={accent}
      >
        {value.name}
      </span>
    </div>
  {/if}
{/if}

<style lang="scss">
  .list-header:not(.colorInherit) {
    color: var(--theme-content-color);
  }
  .list-header.colorInherit {
    color: inherit;
  }
</style>
