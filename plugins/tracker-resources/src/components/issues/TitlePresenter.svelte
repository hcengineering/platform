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
  import type { Issue } from '@hcengineering/tracker'
  import { DocNavLink } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import ParentNamesPresenter from './ParentNamesPresenter.svelte'

  export let value: WithLookup<Issue>
  export let shouldUseMargin: boolean = false
  export let showParent: boolean = true
  export let kind: 'list' | undefined = undefined
  export let onClick: (() => void) | undefined = undefined
  export let disabled: boolean = false
  export let maxWidth: string | undefined = undefined
</script>

{#if value}
  <span
    class="presenter-label select-text"
    class:with-margin={shouldUseMargin}
    class:list={kind === 'list'}
    style:max-width={maxWidth}
    title={value.title}
  >
    <DocNavLink object={value} {onClick} component={tracker.component.EditIssue} shrink={1} colorInherit>
      {value.title}
    </DocNavLink>
  </span>
  {#if showParent}
    <ParentNamesPresenter {value} />
  {/if}
  <slot />
{/if}

<style lang="scss">
  .presenter-label {
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    flex-shrink: 1;
    min-width: 1rem;

    &.list {
      color: var(--theme-caption-color);
    }
    &:hover {
      text-decoration: underline;
    }
    &:active {
      color: var(--theme-content-color);
    }
  }

  .with-margin {
    margin-left: 0.5rem;
  }
</style>
