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

  let varsStyle: string = ''
  const propsWidth: Record<string, number> = { issue: 0 }
  $: if (propsWidth) {
    varsStyle = ''
    for (const key in propsWidth) varsStyle += `--fixed-${key}: ${propsWidth[key]}px;`
  }
  const checkWidth = (key: string, result: CustomEvent): void => {
    if (result !== undefined) propsWidth[key] = result.detail
  }
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
      eventToHTMLElement(event)
    )
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<ListView count={reports.length}>
  <svelte:fragment slot="item" let:item>
    {@const report = reports[item]}
    {@const currentTeam = teams.get(toTeamId(report.space))}
    <div
      class="flex-between row"
      style={varsStyle}
      on:contextmenu|preventDefault={(ev) => showContextMenu(ev, report)}
      on:mouseover={() => {
        listProvider.updateFocus(report)
      }}
      on:focus={() => {
        listProvider.updateFocus(report)
      }}
      on:click={(evt) => editSpendReport(evt, report, currentTeam?.defaultTimeReportDay)}
    >
      <div class="flex-row-center clear-mins gap-2 p-2">
        <span class="issuePresenter">
          <FixedColumn
            width={propsWidth.issue}
            key={'issue'}
            justify={'left'}
            on:update={(result) => checkWidth('issue', result)}
          >
            {#if currentTeam && report.$lookup?.attachedTo}
              {getIssueId(currentTeam, report.$lookup?.attachedTo)}
            {/if}
          </FixedColumn>
        </span>
        {#if report.$lookup?.attachedTo?.title}
          <span class="text name" title={report.$lookup?.attachedTo?.title}>
            {report.$lookup?.attachedTo?.title}
          </span>
        {/if}
      </div>
      <div class="flex-center flex-no-shrink gap-2">
        <UserBox
          label={tracker.string.Assignee}
          _class={contact.class.Employee}
          value={report.employee}
          readonly
          showNavigate={false}
        />
        <TimePresenter value={report.value} workDayLength={currentTeam?.workDayLength} />
        <DatePresenter value={report.date} />
      </div>
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
