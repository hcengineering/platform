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
  import { Doc, Ref, Space, WithLookup } from '@hcengineering/core'
  import UserBox from '@hcengineering/presentation/src/components/UserBox.svelte'
  import { Team, TimeReportDayType, TimeSpendReport } from '@hcengineering/tracker'
  import { eventToHTMLElement, getEventPositionElement, ListView, showPopup } from '@hcengineering/ui'
  import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import DatePresenter from '@hcengineering/ui/src/components/calendar/DatePresenter.svelte'
  import { ContextMenu, FixedColumn, ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
  import { getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import TimePresenter from './TimePresenter.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'

  export let reports: WithLookup<TimeSpendReport>[]

  export let teams: Map<Ref<Team>, Team>

  function showContextMenu (ev: MouseEvent, object: TimeSpendReport) {
    showPopup(ContextMenu, { object }, getEventPositionElement(ev))
  }

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {})

  const toTeamId = (ref: Ref<Space>) => ref as Ref<Team>

  function editSpendReport (
    event: MouseEvent,
    value: TimeSpendReport,
    defaultTimeReportDay: TimeReportDayType | undefined
  ): void {
    showPopup(
      TimeSpendReportPopup,
      {
        issue: value.attachedTo,
        issueClass: value.attachedToClass,
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
<ListView count={reports.length} addClass={'step-tb-2-accent'}>
  <svelte:fragment slot="item" let:item>
    {@const report = reports[item]}
    {@const currentTeam = teams.get(toTeamId(report.space))}
    <div
      class="{twoRows ? 'flex-col' : 'flex-between'} p-text-2"
      on:contextmenu|preventDefault={(ev) => showContextMenu(ev, report)}
      on:mouseover={() => {
        listProvider.updateFocus(report)
      }}
      on:focus={() => {
        listProvider.updateFocus(report)
      }}
      on:click={(evt) => editSpendReport(evt, report, currentTeam?.defaultTimeReportDay)}
    >
      <div class="flex-row-center clear-mins gap-2 flex-grow mr-4" class:p-text={twoRows}>
        <FixedColumn key={'tmiespend_issue'} justify={'left'} addClass={'fs-bold'}>
          {#if currentTeam && report.$lookup?.attachedTo}
            {getIssueId(currentTeam, report.$lookup?.attachedTo)}
          {/if}
        </FixedColumn>
        {#if report.$lookup?.attachedTo?.title}
          <span class="overflow-label fs-bold caption-color" title={report.$lookup?.attachedTo?.title}>
            {report.$lookup?.attachedTo?.title}
          </span>
        {/if}
      </div>
      <div class="flex-row-center clear-mins gap-2 self-end" class:p-text={twoRows}>
        <FixedColumn key={'timespend_assignee'} justify={'left'}>
          <UserBox
            width={'100%'}
            label={tracker.string.Assignee}
            _class={contact.class.Employee}
            value={report.employee}
            readonly
            showNavigate={false}
          />
        </FixedColumn>
        <FixedColumn key={'timespend_reported'} justify={'center'}>
          <TimePresenter value={report.value} workDayLength={currentTeam?.workDayLength} />
        </FixedColumn>
        <FixedColumn key={'timespend_date'} justify={'left'}>
          <DatePresenter value={report.date} />
        </FixedColumn>
      </div>
    </div></svelte:fragment
  >
</ListView>
