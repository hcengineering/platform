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
  import { WithLookup } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import { taskTypeStore } from '@hcengineering/task-resources'
  import TaskTypeIcon from '@hcengineering/task-resources/src/components/taskTypes/TaskTypeIcon.svelte'
  import type { Issue } from '@hcengineering/tracker'
  import { AnySvelteComponent, Icon, tooltip } from '@hcengineering/ui'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'
  import { ObjectPresenterType } from '@hcengineering/view'

  import tracker from '../../plugin'

  export let value: WithLookup<Issue> | undefined
  export let disabled: boolean = false
  export let onClick: (() => void) | undefined = undefined
  export let shouldShowAvatar: boolean = false
  export let noUnderline: boolean = disabled
  export let colorInherit: boolean = false
  export let noSelect: boolean = false
  export let inline = false
  export let kind: 'list' | undefined = undefined
  export let type: ObjectPresenterType = 'link'
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  $: taskType = value !== undefined ? $taskTypeStore.get(value.kind) : undefined
</script>

{#if inline && value}
  <ObjectMention object={value} {disabled} {onClick} component={tracker.component.EditIssue} />
{:else if value}
  {#if type === 'link'}
    <div class="flex-row-center">
      <DocNavLink
        object={value}
        {onClick}
        {disabled}
        {noUnderline}
        {inline}
        {colorInherit}
        component={tracker.component.EditIssue}
        shrink={0}
      >
        <span class="issuePresenterRoot" class:list={kind === 'list'} class:cursor-pointer={!disabled}>
          {#if shouldShowAvatar}
            <div class="icon" use:tooltip={{ label: tracker.string.Issue }}>
              {#if taskType !== undefined}
                <TaskTypeIcon value={taskType} />
              {:else}
                <Icon icon={icon ?? tracker.icon.Issues} size={'small'} />
              {/if}
            </div>
          {/if}
          <span class="overflow-label" class:select-text={!noSelect} title={value?.title}>
            {value.identifier}
            <slot name="details" />
          </span>
        </span>
      </DocNavLink>
    </div>
  {:else if value && type === 'text'}
    <span class="overflow-label" class:select-text={!noSelect} use:tooltip={{ label: getEmbeddedLabel(value.title) }}>
      {value.identifier}
    </span>
  {/if}
{/if}

<style lang="scss">
  .issuePresenterRoot {
    display: flex;
    align-items: center;
    flex-shrink: 0;

    &:not(.list) {
      color: var(--theme-content-color);
    }

    &.list {
      color: var(--theme-halfcontent-color);
    }

    .icon {
      margin-right: 0.5rem;
      color: var(--theme-dark-color);
    }
  }
</style>
