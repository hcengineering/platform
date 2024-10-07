<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import { UserBox } from '@hcengineering/contact-resources'
  import { Ref, Space, WithLookup } from '@hcengineering/core'
  import { Project, TimeReportDayType, TimeSpendReport } from '@hcengineering/tracker'
  import {
    DatePresenter,
    ListView,
    deviceOptionsStore as deviceInfo,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { FixedColumn, ListSelectionProvider, showMenu } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import { activeProjects } from '../../../utils'
  import TimePresenter from './TimePresenter.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'

  export let reports: WithLookup<TimeSpendReport>[]

  const listProvider = new ListSelectionProvider(() => {})

  const toProjectId = (ref: Ref<Space>) => ref as Ref<Project>

  function editSpendReport (
    event: MouseEvent,
    value: TimeSpendReport,
    defaultTimeReportDay: TimeReportDayType | undefined
  ): void {
    showPopup(
      TimeSpendReportPopup,
      {
        issueId: value.attachedTo,
        issueClass: value.attachedToClass,
        space: value.space,
        value,
        assignee: value.employee,
        defaultTimeReportDay
      },
      $deviceInfo.isMobile ? 'top' : eventToHTMLElement(event)
    )
  }
  $: twoRows = $deviceInfo.twoRows
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<ListView count={reports.length} addClass={'step-tb-2-accent'}>
  <svelte:fragment slot="item" let:item>
    {@const report = reports[item]}
    {@const currentProject = $activeProjects.get(toProjectId(report.space))}
    <div
      class="{twoRows ? 'flex-col' : 'flex-between'} p-text-2 clear-mins"
      on:contextmenu={(ev) => {
        showMenu(ev, { object: report })
      }}
      on:mouseenter={() => {
        listProvider.updateFocus(report)
      }}
      on:focus={() => {
        listProvider.updateFocus(report)
      }}
      on:click={(evt) => {
        editSpendReport(evt, report, currentProject?.defaultTimeReportDay)
      }}
    >
      <div class="flex-row-center clear-mins gap-2 flex-grow mr-4" class:p-text={twoRows}>
        <FixedColumn key={'timespend_issue'} justify={'left'} addClass={'fs-bold'}>
          {#if report.$lookup?.attachedTo}
            {report.$lookup?.attachedTo?.identifier}
          {/if}
        </FixedColumn>
        {#if report.$lookup?.attachedTo?.title}
          <span class="overflow-label fs-bold caption-color" title={report.$lookup?.attachedTo?.title}>
            {report.$lookup?.attachedTo?.title}
          </span>
        {/if}
      </div>
      <div class="flex-row-center clear-mins gap-2 self-end flex-no-shrink" class:p-text={twoRows}>
        <FixedColumn key={'timespend_assignee'} justify={'left'}>
          <UserBox
            width={'100%'}
            kind={'ghost'}
            label={tracker.string.Assignee}
            _class={contact.mixin.Employee}
            value={report.employee}
            readonly
            showNavigate={false}
          />
        </FixedColumn>
        <FixedColumn key={'timespend_reported'} justify={'center'}>
          <TimePresenter value={report.value} />
        </FixedColumn>
        <FixedColumn key={'timespend_date'} justify={'left'}>
          <DatePresenter value={report.date} kind={'ghost'} size={'small'} />
        </FixedColumn>
      </div>
    </div>
  </svelte:fragment>
</ListView>
