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
  import type { Issue, Team } from '@hcengineering/tracker'
  import { Icon, showPanel, tooltip } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let value: WithLookup<Issue>
  export let disableClick = false
  export let onClick: (() => void) | undefined = undefined
  export let withIcon = false
  export let noUnderline = false
  export let inline = false

  // Extra properties
  export let teams: Map<Ref<Team>, Team> | undefined = undefined

  function handleIssueEditorOpened () {
    if (disableClick) {
      return
    }

    if (onClick) {
      onClick()
    }

    showPanel(tracker.component.EditIssue, value._id, value._class, 'content')
  }

  const spaceQuery = createQuery()
  let currentTeam: Team | undefined = value?.$lookup?.space

  $: if (teams === undefined) {
    if (value && value?.$lookup?.space === undefined) {
      spaceQuery.query(tracker.class.Team, { _id: value.space }, (res) => ([currentTeam] = res))
    } else {
      spaceQuery.unsubscribe()
    }
  } else {
    currentTeam = teams.get(value.space)
  }

  $: title = currentTeam ? `${currentTeam.identifier}-${value?.number}` : `${value?.number}`
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span
    class="issuePresenterRoot"
    class:noPointer={disableClick}
    class:noUnderline
    class:inline
    on:click={handleIssueEditorOpened}
  >
    {#if withIcon}
      <div class="icon" use:tooltip={{ label: tracker.string.Issue }}>
        <Icon icon={tracker.icon.Issues} size={'small'} />
      </div>
    {/if}
    <span class="select-text" title={value?.title}>
      {title}
    </span>
  </span>
{/if}

<style lang="scss">
  .issuePresenterRoot {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    max-width: 5rem;
    color: var(--content-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;

    .icon {
      margin-right: 0.5rem;
      color: var(--dark-color);
    }

    &.inline {
      display: inline-flex;
      align-items: baseline;

      .icon {
        transform: translateY(0.2rem);
      }
      .select-text {
        font-weight: 500;
        color: var(--accent-color);
      }
    }
    &.noPointer {
      cursor: default;
    }

    &.noUnderline {
      color: var(--caption-color);
      font-weight: 500;
    }

    &:not(.noUnderline) {
      &:hover {
        color: var(--caption-color);
        text-decoration: underline;

        .icon {
          color: var(--caption-color);
        }
      }
    }

    &:active {
      color: var(--accent-color);
    }
  }
</style>
