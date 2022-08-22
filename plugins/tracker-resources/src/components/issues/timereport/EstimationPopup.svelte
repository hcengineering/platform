<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Button, EditBox, EditStyle, eventToHTMLElement, IconAdd, Label, Scroller, showPopup } from '@anticrm/ui'
  import { TableBrowser } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../../plugin'
  import IssuePresenter from '../IssuePresenter.svelte'
  import ParentNamesPresenter from '../ParentNamesPresenter.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'

  export let value: string | number | undefined
  export let format: 'text' | 'password' | 'number'
  export let kind: EditStyle = 'search-style'
  export let maxWidth: string = '10rem'
  export let object: Issue

  let _value = value

  const dispatch = createEventDispatcher()

  function _onkeypress (ev: KeyboardEvent) {
    if (ev.key === 'Enter') dispatch('close', _value)
  }
  const options: FindOptions<TimeSpendReport> = {
    lookup: { employee: contact.class.Employee, attachedTo: tracker.class.Issue }
  }
  $: childIds = Array.from((object.childInfo ?? []).map((it) => it.childId))
</script>

<Card
  label={tracker.string.Estimation}
  canSave={true}
  okAction={() => {
    dispatch('close', _value)
  }}
  okLabel={presentation.string.Save}
  on:close={() => {
    dispatch('close', null)
  }}
>
  <svelte:fragment slot="header">
    <IssuePresenter value={object} disableClick />
  </svelte:fragment>
  <div class="header no-border flex-col p-1">
    <div class="flex-row-center flex-between">
      <EditBox
        bind:value={_value}
        {format}
        {kind}
        {maxWidth}
        placeholder={tracker.string.Estimation}
        focus
        on:keypress={_onkeypress}
      />
    </div>
  </div>
  <Label label={tracker.string.ChildEstimation} />:
  <Scroller tableFade>
    <TableBrowser
      _class={tracker.class.Issue}
      query={{ _id: { $in: childIds } }}
      config={['', { key: '$lookup.attachedTo', presenter: ParentNamesPresenter }, 'estimation']}
      {options}
    />
  </Scroller>
  <Label label={tracker.string.ReportedTime} />:
  <Scroller tableFade>
    <TableBrowser
      _class={tracker.class.TimeSpendReport}
      query={{ attachedTo: { $in: [object._id, ...childIds] } }}
      config={[
        '$lookup.attachedTo',
        { key: '$lookup.attachedTo', presenter: ParentNamesPresenter },
        '',
        '$lookup.employee',
        'date',
        'description'
      ]}
      {options}
    />
  </Scroller>
  <svelte:fragment slot="buttons">
    <Button
      icon={IconAdd}
      size={'small'}
      on:click={(event) => {
        showPopup(
          TimeSpendReportPopup,
          { issueId: object._id, issueClass: object._class, space: object.space },
          eventToHTMLElement(event)
        )
      }}
      label={tracker.string.TimeSpendReportAdd}
    />
  </svelte:fragment>
</Card>
