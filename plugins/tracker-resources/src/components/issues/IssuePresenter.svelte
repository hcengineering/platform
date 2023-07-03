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
  import { Icon, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import tracker from '../../plugin'

  export let value: WithLookup<Issue>
  export let disabled = false
  export let onClick: (() => void) | undefined = undefined
  export let shouldShowAvatar: boolean = false
  export let noUnderline = false
  export let inline = false
  export let kind: 'list' | undefined = undefined

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
    <span class="issuePresenterRoot" class:inline class:list={kind === 'list'}>
      {#if !inline && shouldShowAvatar}
        <div class="icon" use:tooltip={{ label: tracker.string.Issue }}>
          <Icon icon={tracker.icon.Issues} size={'small'} />
        </div>
      {/if}
      <span class="select-text" title={value?.title}>
        {title}
      </span>
    </span>
  </DocNavLink>
{/if}

<style lang="scss">
  .issuePresenterRoot {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    max-width: 5rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;

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

    &.inline {
      display: inline-flex;
      align-items: baseline;

      .icon {
        transform: translateY(0.2rem);
      }
      .select-text {
        font-weight: 500;
        color: var(--theme-caption-color);
      }
    }
  }
</style>
