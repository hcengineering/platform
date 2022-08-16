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
  import { FindOptions } from '@anticrm/core'
  import presentation, { Card } from '@anticrm/presentation'
  import { Issue, TimeSpendReport } from '@anticrm/tracker'
  import { Button, eventToHTMLElement, IconAdd, Scroller, showPopup } from '@anticrm/ui'
  import { TableBrowser } from '@anticrm/view-resources'
  import tracker from '../../../plugin'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'
  export let issue: Issue

  export function canClose (): boolean {
    return true
  }
  const options: FindOptions<TimeSpendReport> = {
    lookup: { employee: contact.class.Employee }
  }
  function addReport (event: MouseEvent): void {
    showPopup(
      TimeSpendReportPopup,
      { issueId: issue._id, issueClass: issue._class, space: issue.space },
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
>
  <Scroller tableFade>
    <TableBrowser
      _class={tracker.class.TimeSpendReport}
      query={{ attachedTo: issue._id }}
      config={['', '$lookup.employee', 'description', 'date', 'modifiedOn', 'modifiedBy']}
      {options}
    />
  </Scroller>
  <svelte:fragment slot="buttons">
    <Button icon={IconAdd} size={'large'} on:click={addReport} />
  </svelte:fragment>
</Card>
