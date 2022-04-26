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
  import contact from '@anticrm/contact'
  import { Class, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { createQuery, getClient, UserBox } from '@anticrm/presentation'
  import { StyledTextBox } from '@anticrm/text-editor'
  import type { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { AnyComponent, Button, EditBox, IconDownOutline, IconUpOutline, Label, Scroller, IconMoreH, IconEdit } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'
  // import Card from '../Card.svelte'
  import { Panel } from '@anticrm/panel'
  import IssuePresenter from './IssuePresenter.svelte'
  import StatusPresenter from './StatusPresenter.svelte'
  import PriorityPresenter from './PriorityPresenter.svelte'

  export let _id: Ref<Issue>
  export let _class: Ref<Class<Issue>>
  export let rightSection: AnyComponent | undefined = undefined

  const query = createQuery()
  const statusesQuery = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let issue: Issue | undefined
  let currentTeam: Team | undefined
  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  let fullSize: boolean = false
  let innerWidth: number

  $: _id &&
    _class &&
    query.query(_class, { _id }, async (result) => {
      issue = result[0]
    })

  $: if (issue !== undefined) {
    client.findOne(tracker.class.Team, { _id: issue.space }).then((r) => {
      currentTeam = r
    })
  }

  $: currentTeam &&
    statusesQuery.query(
      tracker.class.IssueStatus,
      { attachedTo: currentTeam._id },
      (statuses) => {
        issueStatuses = statuses
      },
      {
        lookup: { category: tracker.class.IssueStatusCategory },
        sort: { rank: SortingOrder.Ascending }
      }
    )

  $: issueLabel = currentTeam && issue && `${currentTeam.identifier}-${issue.number}`

  function change (field: string, value: any) {
    if (issue !== undefined) {
      client.update(issue, { [field]: value })
    }
  }

  function copy (text: string): void {
    navigator.clipboard.writeText(text)
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'description', 'number'] })
  })
</script>

{#if issue !== undefined}
  <Panel
    object={issue}
    {fullSize}
    showHeader={false}
    isSubtitle={true}
    position={'content'}
    bind:innerWidth
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="custom-title">
      Custom Title
    </svelte:fragment>
    <svelte:fragment slot="subtitle">
      <div class="flex-between flex-grow">
        {#if currentTeam}
          <IssuePresenter value={issue} {currentTeam} />
        {/if}
        <div class="buttons-group xsmall-gap">
          <Button icon={IconEdit} kind={'transparent'} size={'medium'} />
          {#if innerWidth < 900}
            <Button icon={IconMoreH} kind={'transparent'} size={'medium'} />
          {/if}
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="navigate-actions">
      <Button icon={IconDownOutline} kind={'secondary'} size={'medium'} />
      <Button icon={IconUpOutline} kind={'secondary'} size={'medium'} />
    </svelte:fragment>

    <div class="flex-col flex-grow flex-no-shrink h-full mx-auto content">
      <div class="mt-6">
        <EditBox
          label={tracker.string.Title}
          bind:value={issue.title}
          placeholder={tracker.string.IssueTitlePlaceholder}
          maxWidth={'16rem'}
          focus
          on:change={() => change('title', issue?.title)}
        />
      </div>
      <div class="mt-6">
        <StyledTextBox
          alwaysEdit
          bind:content={issue.description}
          placeholder={tracker.string.IssueDescriptionPlaceholder}
          on:value={(evt) => change('description', evt.detail)}
        />
      </div>
    </div>

    <svelte:fragment slot="properties">
      {#if issue && currentTeam && issueStatuses}
        <div class="flex-grow relative min-w-80 right-panel">
          <div class="ac-header short divide header">
            <span class="w-24 overflow-label">{issueLabel}</span>
            <div class="buttons-group">
              <Button
                icon={tracker.icon.Issue}
                title={tracker.string.CopyIssueUrl}
                width="min-content"
                size="small"
                kind="transparent"
                on:click={() => copy(window.location.href)}
              />
              <Button
                icon={tracker.icon.Views}
                title={tracker.string.CopyIssueId}
                width="min-content"
                size="small"
                kind="transparent"
                on:click={() => issueLabel && copy(issueLabel)}
              />
            </div>
          </div>

          <div class="content">
            <div class="flex-row-center mb-4">
              <span class="label w-24">
                <Label label={tracker.string.Status} />
              </span>
              <StatusPresenter value={issue} statuses={issueStatuses} currentSpace={currentTeam._id} shouldShowLabel />
            </div>

            <div class="flex-row-center mb-4">
              <span class="label w-24">
                <Label label={tracker.string.Priority} />
              </span>
              <PriorityPresenter value={issue} currentSpace={currentTeam._id} shouldShowLabel />
            </div>

            <div class="flex-row-center mb-4">
              <span class="label w-24">
                <Label label={tracker.string.Assignee} />
              </span>
              <UserBox
                _class={contact.class.Employee}
                label={tracker.string.Assignee}
                placeholder={tracker.string.Assignee}
                bind:value={issue.assignee}
                allowDeselect
                titleDeselect={tracker.string.Unassigned}
                on:change={() => change('assignee', issue?.assignee)}
              />
            </div>

            <div class="flex-row-center mb-4">
              <span class="label w-24">
                <Label label={tracker.string.Labels} />
              </span>
              <Button
                label={tracker.string.Labels}
                icon={tracker.icon.Labels}
                width="min-content"
                size="small"
                kind="no-border"
              />
            </div>

            <div class="devider" />

            <div class="flex-row-center mb-4">
              <span class="label w-24">
                <Label label={tracker.string.Project} />
              </span>
              <Button
                label={tracker.string.Project}
                icon={tracker.icon.Projects}
                width="min-content"
                size="small"
                kind="no-border"
              />
            </div>
          </div>
        </div>
      {/if}
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .main-panel {
    flex-grow: 2;
    flex-basis: 47.5rem;

    .header {
      max-width: 56.25rem;
      width: calc(100% - 5rem);
      justify-content: space-between;
      padding: 0 1.25rem;
    }

    .content {
      max-width: 53.75rem;
      width: calc(100% - 7.5rem);
    }
  }

  .right-panel {
    .header {
      padding: 1rem 0;
      margin: 0 1.5rem;
    }

    .content {
      position: absolute;
      inset: 2.5rem 0 0;
      padding: 1.5rem 0.5rem 1.5rem 1.5rem;

      .label {
        margin: 0.625rem 0;
      }
    }

    .devider {
      height: 1px;
      border-bottom: 1px solid var(--divider-color);
      margin: 0.75rem 1.5rem 1.25rem 0;
    }

    &::before {
      content: '';
      position: absolute;
      border-left: 1px solid var(--divider-color);
      top: 1.125rem;
      bottom: 1.125rem;
      width: 0px;
    }
  }
</style>
