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
  import { FindOptions } from '@hcengineering/core'
  import presentation, { Card } from '@hcengineering/presentation'
  import { Issue, Project, TimeSpendReport } from '@hcengineering/tracker'
  import { Button, eventToHTMLElement, IconAdd, Scroller, showPopup, tableSP } from '@hcengineering/ui'
  import { TableBrowser } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import IssuePresenter from '../IssuePresenter.svelte'
  import ParentNamesPresenter from '../ParentNamesPresenter.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'
  export let issue: Issue
  export let currentProject: Project | undefined

  $: defaultTimeReportDay = currentProject?.defaultTimeReportDay

  export function canClose (): boolean {
    return true
  }
  const options: FindOptions<TimeSpendReport> = {
    lookup: {
      attachedTo: tracker.class.Issue,
      employee: contact.mixin.Employee
    }
  }
  function addReport (event: MouseEvent): void {
    showPopup(
      TimeSpendReportPopup,
      {
        issue,
        issueId: issue._id,
        issueClass: issue._class,
        space: issue.space,
        assignee: issue.assignee,
        defaultTimeReportDay
      },
      eventToHTMLElement(event)
    )
  }
</script>

<Card
  label={tracker.string.TimeSpendReports}
  canSave={true}
  on:close
  okAction={() => {}}
  okLabel={presentation.string.Ok}
  on:changeContent
>
  <svelte:fragment slot="header">
    <IssuePresenter value={issue} disabled />
  </svelte:fragment>
  <div class="h-50">
    <Scroller fade={tableSP}>
      <TableBrowser
        showFilterBar={false}
        _class={tracker.class.TimeSpendReport}
        query={{ attachedTo: { $in: [issue._id, ...(issue.childInfo?.map((it) => it.childId) ?? [])] } }}
        config={[
          '$lookup.attachedTo',
          '',
          'employee',
          {
            key: '$lookup.attachedTo',
            presenter: ParentNamesPresenter,
            props: { maxWidth: '20rem' },
            label: tracker.string.Title
          },
          'date',
          'description'
        ]}
        {options}
      />
    </Scroller>
  </div>
  <svelte:fragment slot="buttons">
    <Button id="ReportsPopupAddButton" icon={IconAdd} size={'large'} on:click={addReport} />
  </svelte:fragment>
</Card>
