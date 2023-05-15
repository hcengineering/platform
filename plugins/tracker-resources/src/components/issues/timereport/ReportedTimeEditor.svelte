<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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
  import type { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import tracker, { Issue, Project } from '@hcengineering/tracker'
  import { ActionIcon, eventToHTMLElement, floorFractionDigits, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import ReportsPopup from './ReportsPopup.svelte'
  import TimePresenter from './TimePresenter.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'

  // export let label: IntlString
  export let placeholder: IntlString
  export let object: Issue
  export let value: number
  export let kind: 'no-border' | 'link' = 'no-border'
  export let size: 'small' | 'medium' | 'large' = 'large'
  export let currentProject: Project | undefined

  const spaceQuery = createQuery()
  $: if (currentProject === undefined) {
    spaceQuery.query(tracker.class.Project, { _id: object.space }, (res) => {
      currentProject = res.shift()
    })
  } else {
    spaceQuery.unsubscribe()
  }

  $: defaultTimeReportDay = currentProject?.defaultTimeReportDay

  function addTimeReport (event: MouseEvent): void {
    showPopup(
      TimeSpendReportPopup,
      {
        issue: object,
        issueId: object._id,
        defaultTimeReportDay,
        issueClass: object._class,
        space: object.space,
        assignee: object.assignee,
        currentProject
      },
      eventToHTMLElement(event)
    )
  }
  function showReports (event: MouseEvent): void {
    showPopup(ReportsPopup, { issue: object }, eventToHTMLElement(event))
  }
  $: childTime = floorFractionDigits(
    (object.childInfo ?? []).map((it) => it.reportedTime).reduce((a, b) => a + b, 0),
    3
  )
</script>

{#if kind === 'link'}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div id="ReportedTimeEditor" class="link-container {size} flex-between" on:click={showReports}>
    {#if value !== undefined}
      <span class="overflow-label">
        <TimePresenter {value} />
        {#if childTime !== 0}
          / <TimePresenter value={childTime} />
        {/if}
      </span>
    {:else}
      <span class="content-dark-color"><Label label={placeholder} /></span>
    {/if}
    <div class="add-action">
      <ActionIcon icon={IconAdd} size={'small'} action={addTimeReport} />
    </div>
  </div>
{:else if value !== undefined}
  <span class="overflow-label">
    <TimePresenter {value} />
    {#if childTime !== 0}
      / <TimePresenter value={childTime} />
    {/if}
  </span>
{:else}
  <span class="content-dark-color"><Label label={placeholder} /></span>
{/if}

<style lang="scss">
  .link-container {
    display: flex;
    align-items: center;
    padding: 0 0.875rem;
    width: 100%;
    color: var(--theme-caption-color);
    border: 1px solid transparent;
    border-radius: 0.25rem;
    cursor: pointer;

    &.small {
      height: 1.5rem;
    }
    &.medium {
      height: 2rem;
    }
    &.large {
      height: 2.25rem;
    }
    .add-action {
      visibility: hidden;
    }

    &:hover {
      background-color: var(--theme-bg-color);
      border-color: var(--theme-divider-color);

      .add-action {
        visibility: visible;
      }
    }
  }
</style>
