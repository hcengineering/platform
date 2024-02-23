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
  import { AssigneeBox } from '@hcengineering/contact-resources'
  import { Issue } from '@hcengineering/tracker'
  import { ListView, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { FixedColumn, ListSelectionProvider, showMenu } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import EstimationEditor from './EstimationEditor.svelte'

  export let issues: Issue[]

  const listProvider = new ListSelectionProvider(() => {})
  $: twoRows = $deviceInfo.twoRows
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<ListView count={issues.length} addClass={'step-tb-2-accent'}>
  <svelte:fragment slot="item" let:item>
    {@const issue = issues[item]}
    <div
      class="{twoRows ? 'flex-col' : 'flex-between'} p-text-2 clear-mins"
      on:contextmenu={(ev) => {
        showMenu(ev, { object: issue })
      }}
      on:mouseover={() => {
        listProvider.updateFocus(issue)
      }}
      on:focus={() => {
        listProvider.updateFocus(issue)
      }}
    >
      <div class="flex-row-center clear-mins gap-2 flex-grow mr-4" class:p-text={twoRows}>
        <FixedColumn key={'estimation_issue'} justify={'left'} addClass={'fs-bold'}>
          {issue.identifier}
        </FixedColumn>
        <span class="overflow-label fs-bold caption-color" title={issue.title}>
          {issue.title}
        </span>
      </div>

      <div class="flex-row-center clear-mins gap-2 self-end flex-no-shrink" class:p-text={twoRows}>
        <FixedColumn key={'estimation_issue_assignee'} justify={'right'}>
          <AssigneeBox
            width={'100%'}
            kind={'ghost'}
            label={tracker.string.Assignee}
            _class={contact.mixin.Employee}
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
