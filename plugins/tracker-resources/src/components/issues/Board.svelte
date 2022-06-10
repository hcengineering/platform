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
  import { Class, Doc, FindOptions, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { Kanban, TypeState } from '@anticrm/kanban'
  import { createQuery } from '@anticrm/presentation'
  import type { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, Icon, IconAdd, showPopup, Tooltip, showPanel } from '@anticrm/ui'
  import { focusStore, ListSelectionProvider, SelectDirection, selectionStore } from '@anticrm/view-resources'
  import ActionContext from '@anticrm/view-resources/src/components/ActionContext.svelte'
  import Menu from '@anticrm/view-resources/src/components/Menu.svelte'
  import { onMount } from 'svelte'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'
  import AssigneePresenter from './AssigneePresenter.svelte'
  import IssuePresenter from './IssuePresenter.svelte'
  import PriorityEditor from './PriorityEditor.svelte'
  import ProjectEditor from '../projects/ProjectEditor.svelte'
  import SubIssuesSelector from './edit/SubIssuesSelector.svelte'

  export let currentSpace: Ref<Team>
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined

  /* eslint-disable no-undef */

  const spaceQuery = createQuery()
  const statusesQuery = createQuery()

  let currentTeam: Team | undefined
  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  let states: TypeState[] | undefined
  $: statusesQuery.query(
    tracker.class.IssueStatus,
    { attachedTo: currentSpace },
    (is) => {
      states = is.map((status) => ({
        _id: status._id,
        title: status.name,
        color: status.color ?? status.$lookup?.category?.color ?? 0,
        icon: status.$lookup?.category?.icon ?? undefined
      }))
      issueStatuses = is
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )

  /* eslint-disable prefer-const */
  /* eslint-disable no-unused-vars */
  let issue: Issue

  function toIssue (object: any): WithLookup<Issue> {
    return object as WithLookup<Issue>
  }

  const options: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee
    }
  }

  let kanbanUI: Kanban
  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    kanbanUI.select(offset, of, dir)
  })
  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })

  const showMenu = async (ev: MouseEvent, items: Doc[]): Promise<void> => {
    ev.preventDefault()
    showPopup(
      Menu,
      { object: items, baseMenuClass },
      {
        getBoundingClientRect: () => DOMRect.fromRect({ width: 1, height: 1, x: ev.clientX, y: ev.clientY })
      },
      () => {
        // selection = undefined
      }
    )
  }
</script>

{#if currentTeam && states}
  <ActionContext
    context={{
      mode: 'browser'
    }}
  />
  <div class="flex-between label font-medium w-full p-4">Board</div>
  <Kanban
    bind:this={kanbanUI}
    _class={tracker.class.Issue}
    space={currentSpace}
    search=""
    {states}
    {options}
    query={{ attachedTo: tracker.ids.NoParent }}
    fieldName={'status'}
    rankFieldName={'rank'}
    on:content={(evt) => {
      listProvider.update(evt.detail)
    }}
    on:obj-focus={(evt) => {
      listProvider.updateFocus(evt.detail)
    }}
    selection={listProvider.current($focusStore)}
    checked={$selectionStore ?? []}
    on:check={(evt) => {
      listProvider.updateSelection(evt.detail.docs, evt.detail.value)
    }}
    on:contextmenu={(evt) => showMenu(evt.detail.evt, evt.detail.objects)}
  >
    <svelte:fragment slot="header" let:state let:count>
      <div class="header flex-col">
        <div class="flex-between label font-medium w-full h-full">
          <div class="flex-row-center gap-2">
            <Icon icon={state.icon} size={'small'} />
            <span class="lines-limit-2 ml-2">{state.title}</span>
            <span class="counter ml-2 text-md">{count}</span>
          </div>
          <div class="flex gap-1">
            <Tooltip label={tracker.string.AddIssueTooltip} direction={'left'}>
              <Button
                icon={IconAdd}
                kind={'transparent'}
                on:click={() => {
                  showPopup(CreateIssue, { space: currentSpace, status: state._id }, 'top')
                }}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object>
      {@const issue = toIssue(object)}
      <div
        class="tracker-card"
        on:click={() => {
          showPanel(tracker.component.EditIssue, object._id, object._class, 'content')
        }}
      >
        <div class="flex-col mr-6">
          <IssuePresenter value={object} {currentTeam} />
          <span class="fs-bold caption-color mt-1 lines-limit-2">
            {object.title}
          </span>
        </div>
        <div class="abs-rt-content">
          <AssigneePresenter
            value={issue.$lookup?.assignee}
            defaultClass={contact.class.Employee}
            issueId={issue._id}
            {currentSpace}
            isEditable={true}
          />
        </div>
        <div class="buttons-group xxsmall-gap mt-10px">
          {#if issue && issueStatuses && issue.subIssues > 0}
            <SubIssuesSelector {issue} {currentTeam} {issueStatuses} />
          {/if}
          <PriorityEditor
            value={issue}
            isEditable={true}
            kind={'link-bordered'}
            size={'inline'}
            justify={'center'}
            width={''}
          />
          <ProjectEditor
            value={issue}
            isEditable={true}
            kind={'link-bordered'}
            size={'inline'}
            justify={'center'}
            width={''}
          />
        </div>
      </div>
    </svelte:fragment>
  </Kanban>
{/if}

<style lang="scss">
  .header {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--divider-color);

    .label {
      color: var(--caption-color);
      .counter {
        color: rgba(var(--caption-color), 0.8);
      }
    }
  }
  .tracker-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0.5rem 1rem;
    min-height: 6.5rem;
  }
</style>
