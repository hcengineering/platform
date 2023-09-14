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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { Issue, Project } from '@hcengineering/tracker'
  import { AnySvelteComponent, Icon, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { Asset } from '@hcengineering/platform'

  export let value: WithLookup<Issue>
  export let disabled = false
  export let onClick: (() => void) | undefined = undefined
  export let shouldShowAvatar: boolean = false
  export let noUnderline = disabled
  export let inline = false
  export let kind: 'list' | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  // Extra properties
  export let projects: Map<Ref<Project>, Project> | undefined = undefined

  const spaceQuery = createQuery()
  let currentProject: Project | undefined = value?.$lookup?.space

  $: if (value !== undefined) {
    if (value.$lookup?.space === undefined && !projects?.has(value.space)) {
      spaceQuery.query(tracker.class.Project, { _id: value.space }, (res) => ([currentProject] = res))
    } else {
      currentProject = value?.$lookup?.space ?? projects?.get(value?.space)
      spaceQuery.unsubscribe()
    }
  }

  $: title = currentProject ? `${currentProject.identifier}-${value?.number}` : `${value?.number}`
</script>

{#if value}
  <DocNavLink
    object={value}
    {onClick}
    {disabled}
    {noUnderline}
    {inline}
    component={tracker.component.EditIssue}
    shrink={0}
  >
    {#if inline}
      <span class="antiMention" use:tooltip={{ label: tracker.string.Issue }}>@{title}</span>
    {:else}
      <span class="issuePresenterRoot" class:list={kind === 'list'} class:cursor-pointer={!disabled}>
        {#if shouldShowAvatar}
          <div class="icon" use:tooltip={{ label: tracker.string.Issue }}>
            <Icon icon={icon ?? tracker.icon.Issues} size={'small'} />
          </div>
        {/if}
        <span class="overflow-label select-text" title={value?.title}>
          {title}
          <slot name="details" />
        </span>
      </span>
    {/if}
  </DocNavLink>
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
