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
  import { Employee } from '@hcengineering/contact'
  import { EmployeeArrayEditor, employeeRefByAccountUuidStore, UserInfo } from '@hcengineering/contact-resources'
  import contact from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, Project, TimeSpendReport } from '@hcengineering/tracker'
  import {
    Button,
    DatePresenter,
    DropdownIntlItem,
    DropdownLabelsIntl,
    IconClose,
    Label,
    Loading,
    Scroller,
    SearchInput,
    showPopup,
    tableSP,
    themeStore
  } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import tracker from '../../../plugin'
  import IssuePresenter from '../IssuePresenter.svelte'
  import TitlePresenter from '../TitlePresenter.svelte'
  import {
    buildTimeReportsCsv,
    downloadTimeReportsCsv,
    formatHoursDecimal,
    sanitizeFilenamePart
  } from './timeReportsExport'
  import IssueTaskFilterPopup from './IssueTaskFilterPopup.svelte'

  export let projectId: Ref<Project>

  const PAGE_SIZE = 10
  const hoursInWorkingDay = 8

  type TimeTrackerFilter = 'withTime' | 'all'

  let project: Project | undefined
  let issues: Issue[] = []
  let reports: TimeSpendReport[] = []
  let loading = true

  let dateFrom = startOfMonth()
  let dateTo = endOfToday()
  let assigneeFilter: Ref<Employee>[] = []
  let reporterFilter: Ref<Employee>[] = []
  let taskFilter: Issue[] = []
  let taskSearch = ''
  let timeTrackerFilter: TimeTrackerFilter = 'withTime'
  let page = 0

  const projectQuery = createQuery()
  const issuesQuery = createQuery()
  const reportsQuery = createQuery()
  const employeeQuery = createQuery()

  let columnEmployeeDocs: Employee[] = []

  const timeTrackerItems: DropdownIntlItem[] = [
    { id: 'withTime', label: tracker.string.TimeReportsWithRecordedTime },
    { id: 'all', label: tracker.string.TimeReportsAllTasks }
  ]

  $: projectQuery.query(tracker.class.Project, { _id: projectId }, (res) => {
    project = res[0]
  })

  $: memberRefs = (project?.members ?? [])
    .map((m) => $employeeRefByAccountUuidStore.get(m))
    .filter((ref): ref is Ref<Employee> => ref !== undefined)

  $: columnEmployeeRefs = assigneeFilter.length > 0 ? assigneeFilter : memberRefs

  $: if (columnEmployeeRefs.length > 0) {
    employeeQuery.query(contact.mixin.Employee, { _id: { $in: columnEmployeeRefs }, active: true }, (res) => {
      columnEmployeeDocs = res
    })
  } else {
    columnEmployeeDocs = []
  }

  $: employeeById = new Map(columnEmployeeDocs.map((e) => [e._id, e]))

  $: orderedColumnEmployees = columnEmployeeRefs
    .map((ref) => employeeById.get(ref))
    .filter((e): e is Employee => e !== undefined)

  $: issueQuery = buildIssueQuery(projectId, assigneeFilter, taskFilter)

  function buildIssueQuery (
    space: Ref<Project>,
    assignees: Ref<Employee>[],
    tasks: Issue[]
  ): Record<string, unknown> {
    const q: Record<string, unknown> = { space }
    if (assignees.length > 0) q.assignee = { $in: assignees }
    if (tasks.length > 0) {
      const ids = new Set<Ref<Issue>>()
      for (const t of tasks) {
        ids.add(t._id)
        for (const c of t.childInfo ?? []) ids.add(c.childId)
      }
      q._id = { $in: Array.from(ids) }
    }
    return q
  }

  $: issuesQuery.query(tracker.class.Issue, issueQuery, (res) => {
    issues = res
  })

  $: refreshReports(issues, dateFrom, dateTo, reporterFilter)

  function refreshReports (
    issueList: Issue[],
    from: number,
    to: number,
    reporters: Ref<Employee>[]
  ): void {
    if (issueList.length === 0) {
      reports = []
      loading = false
      return
    }
    const reportQuery: Record<string, unknown> = {
      attachedTo: { $in: issueList.map((it) => it._id) },
      date: { $gte: from, $lte: to }
    }
    if (reporters.length > 0) reportQuery.employee = { $in: reporters }

    loading = true
    const updated = reportsQuery.query(
      tracker.class.TimeSpendReport,
      reportQuery,
      (res) => {
        reports = res
        loading = false
      }
    )
    if (!updated) {
      loading = false
    }
  }

  $: matrix = buildMatrix(issues, reports, columnEmployeeRefs, timeTrackerFilter)
  $: filteredRows = filterRowsBySearch(matrix.rows, taskSearch)
  $: totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  $: page = Math.min(page, totalPages - 1)
  $: pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function filterRowsBySearch (
    rows: Array<{ issue: Issue, total: number, cells: Map<Ref<Employee>, number> }>,
    search: string
  ): Array<{ issue: Issue, total: number, cells: Map<Ref<Employee>, number> }> {
    const q = search.trim().toLowerCase()
    if (q === '') return rows
    return rows.filter((row) => {
      const title = (row.issue.title ?? '').toLowerCase()
      const id = (row.issue.identifier ?? '').toLowerCase()
      return title.includes(q) || id.includes(q)
    })
  }

  function addTaskFilter (): void {
    showPopup(
      IssueTaskFilterPopup,
      {
        projectId,
        ignoreIssues: taskFilter.map((it) => it._id)
      },
      'top',
      (issue: Issue | undefined | null) => {
        if (issue == null || issue._class !== tracker.class.Issue) return
        if (taskFilter.some((it) => it._id === issue._id)) return
        taskFilter = [...taskFilter, issue]
        loading = true
        page = 0
      }
    )
  }

  function removeTaskFilter (id: Ref<Issue>): void {
    taskFilter = taskFilter.filter((it) => it._id !== id)
    loading = true
    page = 0
  }

  function clearTaskFilter (): void {
    taskFilter = []
    loading = true
    page = 0
  }

  $: colTotals = columnEmployeeRefs.map((empRef) =>
    filteredRows.reduce((sum, row) => sum + (row.cells.get(empRef) ?? 0), 0)
  )

  function buildMatrix (
    issueList: Issue[],
    reportList: TimeSpendReport[],
    employees: Ref<Employee>[],
    trackerFilter: TimeTrackerFilter
  ): { rows: Array<{ issue: Issue, total: number, cells: Map<Ref<Employee>, number> }> } {
    const byIssueEmp = new Map<string, number>()
    for (const r of reportList) {
      if (r.employee == null) continue
      const key = `${r.attachedTo}:${r.employee}`
      byIssueEmp.set(key, (byIssueEmp.get(key) ?? 0) + r.value)
    }

    const rows: Array<{ issue: Issue, total: number, cells: Map<Ref<Employee>, number> }> = []
    for (const issue of issueList) {
      const cells = new Map<Ref<Employee>, number>()
      let total = 0
      for (const emp of employees) {
        const v = byIssueEmp.get(`${issue._id}:${emp}`) ?? 0
        if (v > 0) cells.set(emp, v)
        total += v
      }
      if (trackerFilter === 'withTime' && total <= 0) continue
      rows.push({ issue, total, cells })
    }
    rows.sort((a, b) => b.total - a.total)
    return { rows }
  }

  function formatSpentTime (hours: number, withPlainHours = false): string {
    if (hours <= 0) return '--:--'
    const days = Math.floor(hours / hoursInWorkingDay)
    const h = Math.floor(hours % hoursInWorkingDay)
    const m = Math.round((hours % 1) * 60)
    const parts: string[] = []
    if (days > 0) parts.push(`${days}d.`)
    if (h > 0) parts.push(`${h}h.`)
    if (m > 0) parts.push(`${m}m.`)
    if (parts.length === 0) return '--:--'
    const main = parts.join(' ')
    if (!withPlainHours) return main
    return `${main} (${formatHoursDecimal(hours)}h.)`
  }

  function startOfMonth (): number {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  function endOfToday (): number {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }

  function onDateChange (): void {
    page = 0
  }

  function getExportIssueIds (
    issueList: Issue[],
    reportList: TimeSpendReport[],
    trackerFilter: TimeTrackerFilter,
    search: string
  ): Set<Ref<Issue>> {
    const rows = buildMatrix(issueList, reportList, columnEmployeeRefs, trackerFilter).rows
    return new Set(filterRowsBySearch(rows, search).map((r) => r.issue._id))
  }

  async function exportToExcel (): Promise<void> {
    if (project === undefined) return
    const lang = $themeStore.language
    const client = getClient()

    const allIssues = await client.findAll(tracker.class.Issue, issueQuery, { showArchived: true })
    if (allIssues.length === 0) return

    const reportQuery: Record<string, unknown> = {
      attachedTo: { $in: allIssues.map((it) => it._id) },
      date: { $gte: dateFrom, $lte: dateTo }
    }
    if (reporterFilter.length > 0) reportQuery.employee = { $in: reporterFilter }

    const allReports = await client.findAll(tracker.class.TimeSpendReport, reportQuery)
    const allowedIssueIds = getExportIssueIds(allIssues, allReports, timeTrackerFilter, taskSearch)
    if (allowedIssueIds.size === 0) return

    const issueById = new Map(allIssues.map((i) => [i._id, i]))
    const hoursByIssue = new Map<Ref<Issue>, number>()

    for (const r of allReports) {
      if (!allowedIssueIds.has(r.attachedTo) || r.value <= 0) continue
      hoursByIssue.set(r.attachedTo, (hoursByIssue.get(r.attachedTo) ?? 0) + r.value)
    }

    const exportRows: Array<{ issue: Issue, hours: number }> = []
    for (const [issueId, hours] of hoursByIssue) {
      const issue = issueById.get(issueId)
      if (issue === undefined) continue
      exportRows.push({ issue, hours })
    }

    if (exportRows.length === 0) return

    exportRows.sort((a, b) => (a.issue.identifier ?? '').localeCompare(b.issue.identifier ?? ''))

    const csv = buildTimeReportsCsv({
      projectName: project.name,
      dateFrom,
      dateTo,
      headers: {
        issueId: await translate(tracker.string.TimeReportsExportColIssueId, {}, lang),
        issueTitle: await translate(tracker.string.TimeReportsExportColIssueTitle, {}, lang),
        parentId: await translate(tracker.string.TimeReportsExportColParentId, {}, lang),
        parentTitle: await translate(tracker.string.TimeReportsExportColParentTitle, {}, lang),
        hours: await translate(tracker.string.TimeReportsExportColHours, {}, lang),
        total: await translate(tracker.string.TimeReportsExportTotal, {}, lang)
      },
      rows: exportRows
    })
    const datePart = new Date().toISOString().slice(0, 10)
    const filename = `time-report-${sanitizeFilenamePart(project.name)}-${datePart}.csv`
    downloadTimeReportsCsv(csv, filename)
  }

  onMount(() => {
    loading = true
  })
</script>

<div class="time-reports">
  <div class="time-reports-filters">
    <div class="filter-item assignees-filter">
      {#if project}
        <span class="filter-hint content-dark-color">
          <Label
            label={tracker.string.TimeReportsOfMembers}
            params={{
              selected: assigneeFilter.length > 0 ? assigneeFilter.length : memberRefs.length,
              total: memberRefs.length
            }}
          />
        </span>
      {/if}
      <EmployeeArrayEditor
        label={tracker.string.TimeReportsFilterAssignees}
        value={assigneeFilter}
        space={projectId}
        kind="regular"
        size="large"
        width="100%"
        onChange={(refs) => {
          assigneeFilter = refs
          loading = true
          page = 0
        }}
      />
    </div>
    <div class="filter-item">
      <DropdownLabelsIntl
        label={tracker.string.TimeReportsFilterTracker}
        kind="regular"
        size="large"
        items={timeTrackerItems}
        bind:selected={timeTrackerFilter}
        on:selected={() => {
          page = 0
        }}
      />
    </div>
    <div class="filters-right">
      <div class="filter-item">
        <EmployeeArrayEditor
          label={tracker.string.TimeReportsFilterReporter}
          value={reporterFilter}
          space={projectId}
          kind="regular"
          size="large"
          width="100%"
          onChange={(refs) => {
            reporterFilter = refs
            page = 0
          }}
        />
      </div>
      <div class="filter-item dates">
        <span class="label mb-1"><Label label={tracker.string.TimeReportsDates} /></span>
        <div class="dates-row">
          <DatePresenter bind:value={dateFrom} editable kind="regular" size="large" on:change={onDateChange} />
          <span class="content-dark-color">—</span>
          <DatePresenter bind:value={dateTo} editable kind="regular" size="large" on:change={onDateChange} />
        </div>
      </div>
    </div>
  </div>

  <div class="time-reports-task-filter">
    <SearchInput
      placeholder={tracker.string.TimeReportsFilterTaskSearch}
      bind:value={taskSearch}
      width="20rem"
      on:change={() => {
        page = 0
      }}
    />
    <Button label={tracker.string.TimeReportsAddTask} kind="regular" size="medium" on:click={addTaskFilter} />
    {#if taskFilter.length > 0}
      <Button label={tracker.string.TimeReportsClearTasks} kind="link" size="medium" on:click={clearTaskFilter} />
    {/if}
  </div>
  {#if taskFilter.length > 0}
    <div class="task-chips">
      {#each taskFilter as task (task._id)}
        <div class="task-chip">
          <IssuePresenter value={task} shouldShowAvatar={true} kind="list" />
          <TitlePresenter value={task} showParent={false} maxWidth="12rem" />
          <Button icon={IconClose} kind="ghost" size="small" on:click={() => { removeTaskFilter(task._id) }} />
        </div>
      {/each}
    </div>
  {/if}

  <div class="time-reports-header">
    <span class="fs-title">
      <Label label={tracker.string.TimeReportsTitle} params={{ count: filteredRows.length }} />
    </span>
    <div class="time-reports-header-actions">
      <Button
        label={tracker.string.TimeReportsExportExcel}
        kind="regular"
        size="medium"
        disabled={loading || filteredRows.length === 0}
        on:click={() => {
          void exportToExcel()
        }}
      />
    </div>
  </div>

  {#if loading}
    <Loading />
  {:else if filteredRows.length === 0}
    <div class="empty content-dark-color"><Label label={tracker.string.TimeReportsEmpty} /></div>
  {:else}
    <Scroller fade={tableSP} horizontal>
      <table class="time-reports-table antiTable">
        <thead>
          <tr class="scroller-thead__tr">
            <th class="id-col"><Label label={tracker.string.Identifier} /></th>
            <th class="title-col"><Label label={tracker.string.Title} /></th>
            <th class="total-col"><Label label={tracker.string.ReportedTime} /></th>
            {#each orderedColumnEmployees as emp, colIdx (emp._id)}
              <th class="person-col">
                <div class="person-header">
                  <UserInfo value={emp} size="card" />
                  <span class="col-total content-dark-color">{formatSpentTime(colTotals[colIdx], true)}</span>
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each pageRows as row (row.issue._id)}
            <tr class="antiTable-body__row">
              <td class="id-col">
                <IssuePresenter value={row.issue} shouldShowAvatar={true} kind="list" />
              </td>
              <td class="title-col">
                <TitlePresenter value={row.issue} showParent={true} maxWidth="24rem" />
              </td>
              <td class="total-col">{formatSpentTime(row.total, true)}</td>
              {#each columnEmployeeRefs as empRef (empRef)}
                <td class="person-col">{formatSpentTime(row.cells.get(empRef) ?? 0, true)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </Scroller>

    {#if totalPages > 1}
      <div class="pagination">
        <button
          class="antiButton link"
          disabled={page === 0}
          on:click={() => {
            page = Math.max(0, page - 1)
          }}
        >
          <Label label={tracker.string.TimeReportsPrevPage} />
        </button>
        {#each Array(totalPages) as _, i}
          <button
            class="antiButton link"
            class:selected={page === i}
            on:click={() => {
              page = i
            }}
          >{i + 1}</button>
        {/each}
        <button
          class="antiButton link"
          disabled={page >= totalPages - 1}
          on:click={() => {
            page = Math.min(totalPages - 1, page + 1)
          }}
        >
          <Label label={tracker.string.TimeReportsNextPage} />
        </button>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .time-reports {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    padding: 1rem 1.5rem;
    gap: 1rem;
  }

  .time-reports-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.25rem;
    align-items: flex-end;
    width: 100%;
  }

  .filters-right {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.25rem;
    align-items: flex-end;
    margin-left: auto;
  }

  .time-reports-task-filter {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
  }

  .task-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .task-chip {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    background-color: var(--theme-button-hovered);
  }

  .filter-item {
    display: flex;
    flex-direction: column;
    flex: 0 1 auto;
    min-width: 11rem;
    max-width: 100%;

    &.assignees-filter {
      flex: 0 1 22rem;
      min-width: 14rem;
      max-width: 22rem;
      gap: 0.25rem;
    }

    &.dates .dates-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }

  .filter-hint {
    font-size: 0.75rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .time-reports-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .time-reports-header-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .time-reports-table {
    width: max-content;
    min-width: 100%;

    th,
    td {
      white-space: nowrap;
      padding: 0.5rem 0.75rem;
      vertical-align: middle;
    }

    .id-col {
      min-width: 7.5rem;
      position: sticky;
      left: 0;
      z-index: 2;
      background-color: var(--theme-table-row-color);
    }

    thead .id-col {
      background-color: var(--theme-table-header-color);
    }

    .title-col {
      min-width: 12rem;
      max-width: 28rem;
      position: sticky;
      left: 7.5rem;
      z-index: 1;
      background-color: var(--theme-table-row-color);
    }

    thead .title-col {
      background-color: var(--theme-table-header-color);
    }

    .total-col {
      min-width: 5rem;
      font-weight: 500;
    }

    .person-col {
      min-width: 7rem;
      text-align: center;
    }
  }

  .person-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .col-total {
    font-size: 0.75rem;
  }

  .empty {
    padding: 2rem;
    text-align: center;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;

    button.selected {
      color: var(--theme-accent-color);
      font-weight: 600;
    }
  }
</style>
