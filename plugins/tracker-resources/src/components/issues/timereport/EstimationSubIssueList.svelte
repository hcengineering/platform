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
  import contact from '@hcengineering/contact'
  import { Doc, Ref } from '@hcengineering/core'
  import { AssigneeBox } from '@hcengineering/presentation'
  import { Issue, Team } from '@hcengineering/tracker'
  import { getEventPositionElement, ListView, showPopup } from '@hcengineering/ui'
  import { ContextMenu, FixedColumn, ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
  import { getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import EstimationEditor from './EstimationEditor.svelte'

  export let issues: Issue[]

  export let teams: Map<Ref<Team>, Team>

  function showContextMenu (ev: MouseEvent, object: Issue) {
    showPopup(ContextMenu, { object }, getEventPositionElement(ev))
  }

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {})
</script>

<ListView count={issues.length}>
  <svelte:fragment slot="item" let:item>
    {@const issue = issues[item]}
    {@const currentTeam = teams.get(issue.space)}
    <div
      class="flex-between row"
      on:contextmenu|preventDefault={(ev) => showContextMenu(ev, issue)}
      on:mouseover={() => {
        listProvider.updateFocus(issue)
      }}
      on:focus={() => {
        listProvider.updateFocus(issue)
      }}
    >
      <div class="flex-row-center clear-mins gap-2 p-2 flex-grow">
        <span class="issuePresenter">
          <FixedColumn key={'estimation_issue'} justify={'left'}>
            {#if currentTeam}
              {getIssueId(currentTeam, issue)}
            {/if}
          </FixedColumn>
        </span>
        <span class="text name" title={issue.title}>
          {issue.title}
        </span>
      </div>

      <FixedColumn key={'estimation_issue_assignee'} justify={'right'}>
        <AssigneeBox
          width={'100%'}
          label={tracker.string.Assignee}
          _class={contact.class.Employee}
          value={issue.assignee}
          assignedTo={issue}
          readonly
          showNavigate={false}
        />
      </FixedColumn>
      <FixedColumn key={'estimation'} justify={'left'}>
        <EstimationEditor value={issue} kind={'list'} />
      </FixedColumn>
    </div>
  </svelte:fragment>
</ListView>

<style lang="scss">
  .row {
    .text {
      font-weight: 500;
      color: var(--caption-color);
    }

    .issuePresenter {
      flex-shrink: 0;
      min-width: 0;
      min-height: 0;
      font-weight: 500;
      color: var(--content-color);
    }

    .name {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
</style>
