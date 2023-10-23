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
  import { Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import type { Issue, Project } from '@hcengineering/tracker'
  import { AnySvelteComponent, Component, Icon, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocNavLink } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { activeProjects } from '../../utils'

  export let value: WithLookup<Issue>
  export let disabled = false
  export let onClick: (() => void) | undefined = undefined
  export let shouldShowAvatar: boolean = false
  export let noUnderline = disabled
  export let inline = false
  export let kind: 'list' | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  let currentProject: Project | undefined = value?.$lookup?.space

  $: if (value !== undefined) {
    currentProject = $activeProjects.get(value?.space)
  }

  $: title = currentProject ? `${currentProject.identifier}-${value?.number}` : `${value?.number}`

  $: presenters =
    value !== undefined ? getClient().getHierarchy().findMixinMixins(value, view.mixin.ObjectPresenter) : []
</script>

{#if value}
  <div class="flex-row-center flex-between">
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
    {#if presenters.length > 0}
      <div class="flex-row-center">
        {#each presenters as mixinPresenter}
          {mixinPresenter.presenter}
          <Component is={mixinPresenter.presenter} props={{ value }} />
        {/each}
      </div>
    {/if}
  </div>
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
