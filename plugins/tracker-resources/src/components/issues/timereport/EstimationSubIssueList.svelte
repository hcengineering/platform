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
  import { Ref } from '@hcengineering/core'
  import { UserBox } from '@hcengineering/presentation'
  import { Issue, Team } from '@hcengineering/tracker'
  import { deviceOptionsStore as deviceInfo, getEventPositionElement, ListView, showPopup } from '@hcengineering/ui'
  import { ContextMenu, FixedColumn, ListSelectionProvider } from '@hcengineering/view-resources'
  import { getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import EstimationEditor from './EstimationEditor.svelte'

  export let issues: Issue[]

  export let teams: Map<Ref<Team>, Team>

  function showContextMenu (ev: MouseEvent, object: Issue) {
    showPopup(ContextMenu, { object }, $deviceInfo.isMobile ? 'top' : getEventPositionElement(ev))
  }

  const listProvider = new ListSelectionProvider(() => {})
  $: twoRows = $deviceInfo.twoRows
</script>

<ListView count={issues.length} addClass={'step-tb-2-accent'}>
  <svelte:fragment slot="item" let:item>
    {@const issue = issues[item]}
    {@const currentTeam = teams.get(issue.space)}
    <div
      class="{twoRows ? 'flex-col' : 'flex-between'} p-text-2"
      on:contextmenu|preventDefault={(ev) => showContextMenu(ev, issue)}
      on:mouseover={() => {
        listProvider.updateFocus(issue)
      }}
      on:focus={() => {
        listProvider.updateFocus(issue)
      }}
    >
      <div class="flex-row-center clear-mins gap-2 flex-grow mr-4" class:p-text={twoRows}>
        <FixedColumn key={'estimation_issue'} justify={'left'} addClass={'fs-bold'}>
          {#if currentTeam}
            {getIssueId(currentTeam, issue)}
          {/if}
        </FixedColumn>
        <span class="overflow-label fs-bold caption-color" title={issue.title}>
          {issue.title}
        </span>
      </div>

      <div class="flex-row-center clear-mins gap-2 self-end" class:p-text={twoRows}>
        <FixedColumn key={'estimation_issue_assignee'} justify={'right'}>
          <UserBox
            width={'100%'}
            label={tracker.string.Assignee}
            _class={contact.class.Employee}
            value={issue.assignee}
            readonly
            showNavigate={false}
          />
        </FixedColumn>
        <FixedColumn key={'estimation'} justify={'left'}>
          <EstimationEditor value={issue} kind={'list'} />
        </FixedColumn>
      </div>
    </div>
  </svelte:fragment>
</ListView>
