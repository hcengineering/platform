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
  import type { IssueTemplate } from '@hcengineering/tracker'
  import { Icon, showPanel } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let value: WithLookup<IssueTemplate>
  // export let inline: boolean = false
  export let disableClick = false

  function handleIssueEditorOpened () {
    if (disableClick) {
      return
    }
    showPanel(tracker.component.EditIssueTemplate, value._id, value._class, 'content')
  }

  $: title = `${value?.title}`
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span class="issuePresenterRoot flex" class:noPointer={disableClick} on:click={handleIssueEditorOpened}>
    <Icon icon={tracker.icon.Issues} size={'small'} />
    <span class="ml-2">
      {title}
    </span>
  </span>
{/if}

<style lang="scss">
  .issuePresenterRoot {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    flex-shrink: 0;
    max-width: 15rem;
    font-size: 0.8125rem;
    color: var(--content-color);
    cursor: pointer;

    &.noPointer {
      cursor: default;
    }

    &:hover {
      color: var(--caption-color);
    }
    &:active {
      color: var(--accent-color);
    }
  }
</style>
