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
  import { Icon, showPanel, tooltip } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let value: WithLookup<IssueTemplate>
  export let disabled = false
  export let noUnderline = false
  export let shouldShowAvatar: boolean = true
  export let inline: boolean = false

  function handleIssueEditorOpened () {
    if (disabled) {
      return
    }
    showPanel(tracker.component.EditIssueTemplate, value._id, value._class, 'content')
  }

  $: title = `${value?.title}`
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span class="issuePresenterRoot" class:noPointer={disabled} class:noUnderline on:click={handleIssueEditorOpened}>
    {#if !inline && shouldShowAvatar}
      <div class="mr-2" use:tooltip={{ label: tracker.string.IssueTemplate }}>
        <Icon icon={tracker.icon.IssueTemplates} size={'small'} />
      </div>
    {/if}
    <span title={value?.title}>
      {title}
    </span>
  </span>
{/if}

<style lang="scss">
  .issuePresenterRoot {
    display: flex;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    flex-shrink: 0;
    max-width: 15rem;
    font-size: 0.8125rem;
    color: var(--theme-content-color);

    &:not(.noPointer) {
      cursor: pointer;
    }

    &.noUnderline,
    &.noUnderline:hover {
      text-decoration: none;
      color: var(--theme-caption-color);
    }

    &:not(.noUnderline) {
      &:hover {
        color: var(--theme-caption-color);
        text-decoration: underline;
      }
    }

    &:active {
      color: var(--theme-caption-color);
    }
  }
</style>
