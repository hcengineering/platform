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
  import { FindOptions, Ref, WithLookup } from '@anticrm/core'
  import { Kanban, TypeState } from '@anticrm/kanban'
  import { createQuery } from '@anticrm/presentation'
  import { Issue, Team } from '@anticrm/tracker'
  import { Button, Component, Icon, IconAdd, IconMoreH, showPopup, Tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'
  import tracker from '../../plugin'
  import { getIssueStatuses } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'
  import IssuePresenter from './IssuePresenter.svelte'

  export let currentSpace: Ref<Team>

  /* eslint-disable no-undef */

  const spaceQuery = createQuery()

  let currentTeam: Team | undefined
  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  let states: TypeState[] | undefined
  $: if (states === undefined) {
    getIssueStatuses(currentSpace).then((statuses) => {
      states = statuses.map((status) => ({
        _id: status._id,
        title: status.name,
        color: status.color ?? status.$lookup?.category?.color ?? 0
      }))
    })
  }

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
</script>

{#if currentTeam && states}
  <div class="flex-between label font-medium w-full p-4">Board</div>
  <Kanban
    _class={tracker.class.Issue}
    space={currentSpace}
    search=""
    {states}
    {options}
    query={{}}
    fieldName={'status'}
    rankFieldName={'rank'}
  >
    <svelte:fragment slot="header" let:state let:count>
      <div class="header flex-col">
        <div class="flex-between label font-medium w-full h-full mb-4">
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
                on:click={(evt) => {
                  showPopup(CreateIssue, { space: currentSpace, issueStatus: state._id }, evt.target)
                }}
              />
            </Tooltip>
            <Button icon={IconMoreH} kind={'transparent'} />
          </div>
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object>
      {@const issue = toIssue(object)}
      <div class="flex-row h-18 pt-2 pb-2 pr-4 pl-4">
        <div class="flex-between mb-2">
          <IssuePresenter value={object} {currentTeam} />
          {#if issue.$lookup?.assignee}
            <Component
              is={view.component.ObjectPresenter}
              props={{ value: issue.$lookup.assignee, props: { showLabel: false } }}
            />
          {/if}
        </div>
        <span class="fs-bold title">
          {object.title}
        </span>
      </div>
    </svelte:fragment>
  </Kanban>
{/if}

<style lang="scss">
  .header {
    height: 6rem;
    min-height: 6rem;
    user-select: none;

    .label {
      color: var(--theme-caption-color);
      border-bottom: 1px solid var(--divider-color);
      .counter {
        color: rgba(var(--theme-caption-color), 0.8);
      }
    }
  }
  .title {
    color: var(--theme-caption-color);
  }
</style>
