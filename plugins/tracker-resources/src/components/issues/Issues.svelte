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
  import contact, { Employee, formatName } from '@anticrm/contact'
  import { DocumentQuery, FindOptions, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import {
    Issue,
    Team,
    IssuesGrouping,
    IssuesOrdering,
    IssuesDateModificationPeriod,
    IssueStatus,
    IssueStatusCategory
  } from '@anticrm/tracker'
  import { Button, Label, ScrollBox, IconOptions, showPopup, eventToHTMLElement, IconAdd, IconClose } from '@anticrm/ui'
  import { IntlString } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'
  import ViewOptionsPopup from './ViewOptionsPopup.svelte'
  import IssuesListBrowser from './IssuesListBrowser.svelte'
  import IssuesFilterMenu from './IssuesFilterMenu.svelte'
  import FilterSummary from '../FilterSummary.svelte'
  import tracker from '../../plugin'
  import {
    IssuesGroupByKeys,
    issuesGroupKeyMap,
    issuesOrderKeyMap,
    getIssuesModificationDatePeriodTime,
    issuesSortOrderMap,
    getGroupedIssues,
    defaultPriorities,
    getArraysIntersection,
    IssueFilter,
    getArraysUnion
  } from '../../utils'

  export let currentSpace: Ref<Team>
  export let title: IntlString = tracker.string.AllIssues
  export let query: DocumentQuery<Issue> = {}
  export let search: string = ''
  export let groupingKey: IssuesGrouping = IssuesGrouping.Status
  export let orderingKey: IssuesOrdering = IssuesOrdering.LastUpdated
  export let completedIssuesPeriod: IssuesDateModificationPeriod | null = IssuesDateModificationPeriod.All
  export let shouldShowEmptyGroups: boolean | undefined = false
  export let includedGroups: Partial<Record<IssuesGroupByKeys, Array<any>>> = {}

  const dispatch = createEventDispatcher()
  const ENTRIES_LIMIT = 200
  const spaceQuery = createQuery()
  const issuesQuery = createQuery()
  const resultIssuesQuery = createQuery()
  const statusesQuery = createQuery()
  const issuesMap: { [status: string]: number } = {}

  let filterElement: HTMLElement | null = null
  let filters: IssueFilter[] = []
  let currentTeam: Team | undefined
  let issues: Issue[] = []
  let resultIssues: Issue[] = []
  let statusesById: ReadonlyMap<Ref<IssueStatus>, WithLookup<IssueStatus>> = new Map()
  let employees: (WithLookup<Employee> | undefined)[] = []

  $: totalIssuesCount = issues.length
  $: resultIssuesCount = resultIssues.length
  $: isFiltersEmpty = filters.length === 0

  const options: FindOptions<Issue> = {
    sort: { [issuesOrderKeyMap[orderingKey]]: issuesSortOrderMap[issuesOrderKeyMap[orderingKey]] },
    limit: ENTRIES_LIMIT,
    lookup: { assignee: contact.class.Employee, status: tracker.class.IssueStatus }
  }

  $: baseQuery = {
    space: currentSpace,
    ...includedIssuesQuery,
    ...modifiedOnIssuesQuery,
    ...query
  }

  $: resultQuery = search === '' ? baseQuery : { $search: search, ...baseQuery }

  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  $: groupByKey = issuesGroupKeyMap[groupingKey]
  $: categories = getCategories(groupByKey, resultIssues, !!shouldShowEmptyGroups)
  $: groupedIssues = getGroupedIssues(groupByKey, resultIssues, categories)
  $: displayedCategories = (categories as any[]).filter((x) => {
    if (groupByKey === undefined || includedGroups[groupByKey] === undefined) {
      return true
    }

    if (groupByKey === 'status') {
      const category = statusesById.get(x as Ref<IssueStatus>)?.category

      return !!(category && includedGroups.status?.includes(category))
    }

    return includedGroups[groupByKey]?.includes(x)
  })
  $: includedIssuesQuery = getIncludedIssuesQuery(includedGroups, statuses)
  $: modifiedOnIssuesQuery = getModifiedOnIssuesFilterQuery(issues, completedIssuesPeriod)
  $: statuses = [...statusesById.values()]

  const getIncludedIssuesQuery = (
    groups: Partial<Record<IssuesGroupByKeys, Array<any>>>,
    issueStatuses: IssueStatus[]
  ) => {
    const resultMap: { [p: string]: { $in: any[] } } = {}

    for (const [key, value] of Object.entries(groups)) {
      const includedCategories = key === 'status' ? filterIssueStatuses(issueStatuses, value) : value
      resultMap[key] = { $in: includedCategories }
    }

    return resultMap
  }

  const getModifiedOnIssuesFilterQuery = (
    currentIssues: WithLookup<Issue>[],
    period: IssuesDateModificationPeriod | null
  ) => {
    const filter: { _id: { $in: Array<Ref<Issue>> } } = { _id: { $in: [] } }

    if (!period || period === IssuesDateModificationPeriod.All) {
      return {}
    }

    for (const issue of currentIssues) {
      if (
        issue.$lookup?.status?.category === tracker.issueStatusCategory.Completed &&
        issue.modifiedOn < getIssuesModificationDatePeriodTime(period)
      ) {
        continue
      }

      filter._id.$in.push(issue._id)
    }

    return filter
  }

  $: issuesQuery.query<Issue>(
    tracker.class.Issue,
    { ...includedIssuesQuery },
    (result) => {
      issues = result

      employees = result.map((x) => x.$lookup?.assignee)
    },
    options
  )

  $: resultIssuesQuery.query<Issue>(
    tracker.class.Issue,
    { ...resultQuery, ...getFiltersQuery(filters) },
    (result) => {
      resultIssues = result

      employees = result.map((x) => x.$lookup?.assignee)
    },
    options
  )

  $: statusesQuery.query(
    tracker.class.IssueStatus,
    { attachedTo: currentSpace },
    (issueStatuses) => {
      statusesById = new Map(issueStatuses.map((status) => [status._id, status]))
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )

  const getCategories = (key: IssuesGroupByKeys | undefined, elements: Issue[], shouldShowAll: boolean) => {
    if (!key) {
      return [undefined] // No grouping
    }

    const defaultStatuses = Object.values(statuses).map((x) => x._id)

    const existingCategories = Array.from(
      new Set(
        elements.map((x) => {
          return x[key]
        })
      )
    )

    if (shouldShowAll) {
      if (key === 'status') {
        return defaultStatuses
      }

      if (key === 'priority') {
        return defaultPriorities
      }
    }

    if (key === 'status') {
      existingCategories.sort((s1, s2) => {
        const i1 = defaultStatuses.findIndex((x) => x === s1)
        const i2 = defaultStatuses.findIndex((x) => x === s2)

        return i1 - i2
      })
    }

    if (key === 'priority') {
      existingCategories.sort((p1, p2) => {
        const i1 = defaultPriorities.findIndex((x) => x === p1)
        const i2 = defaultPriorities.findIndex((x) => x === p2)

        return i1 - i2
      })
    }

    if (key === 'assignee') {
      existingCategories.sort((a1, a2) => {
        const employeeId1 = a1 as Ref<Employee> | null
        const employeeId2 = a2 as Ref<Employee> | null

        if (employeeId1 === null && employeeId2 !== null) {
          return 1
        }

        if (employeeId1 !== null && employeeId2 === null) {
          return -1
        }

        if (employeeId1 !== null && employeeId2 !== null) {
          const name1 = formatName(employees.find((x) => x?._id === employeeId1)?.name ?? '')
          const name2 = formatName(employees.find((x) => x?._id === employeeId2)?.name ?? '')

          if (name1 > name2) {
            return 1
          } else if (name2 > name1) {
            return -1
          }

          return 0
        }

        return 0
      })
    }

    return existingCategories
  }

  function filterIssueStatuses (
    issueStatuses: IssueStatus[],
    issueStatusCategories: Ref<IssueStatusCategory>[]
  ): Ref<IssueStatus>[] {
    const statusCategories = new Set(issueStatusCategories)

    return issueStatuses.filter((status) => statusCategories.has(status.category)).map((s) => s._id)
  }

  const handleOptionsUpdated = (
    result:
      | {
          orderBy: IssuesOrdering
          groupBy: IssuesGrouping
          completedIssuesPeriod: IssuesDateModificationPeriod
          shouldShowEmptyGroups: boolean
        }
      | undefined
  ) => {
    if (result === undefined) {
      return
    }

    for (const prop of Object.getOwnPropertyNames(issuesMap)) {
      delete issuesMap[prop]
    }

    groupingKey = result.groupBy
    orderingKey = result.orderBy
    completedIssuesPeriod = result.completedIssuesPeriod
    shouldShowEmptyGroups = result.shouldShowEmptyGroups

    if (result.groupBy === IssuesGrouping.Assignee || result.groupBy === IssuesGrouping.NoGrouping) {
      shouldShowEmptyGroups = undefined
    }
  }

  const handleOptionsEditorOpened = (event: MouseEvent) => {
    if (!currentSpace) {
      return
    }

    showPopup(
      ViewOptionsPopup,
      { groupBy: groupingKey, orderBy: orderingKey, completedIssuesPeriod, shouldShowEmptyGroups },
      eventToHTMLElement(event),
      undefined,
      handleOptionsUpdated
    )
  }

  const getFiltersQuery = (filters: IssueFilter[]) => {
    const result: { [f: string]: { $in?: any[]; $nin?: any[] } } = {}

    for (const filter of filters) {
      for (const [key, value] of Object.entries(filter.query)) {
        const { mode } = filter

        if (result[key] === undefined) {
          result[key] = { ...value }

          continue
        }

        if (result[key][mode] === undefined) {
          result[key][mode] = [...value[mode]]

          continue
        }

        const resultFunction = mode === '$nin' ? getArraysUnion : getArraysIntersection

        result[key][mode] = resultFunction(result[key]?.[mode] ?? [], value[mode])
      }
    }

    return result
  }

  const handleFilterDeleted = (filterIndex?: number) => {
    if (filterIndex !== undefined) {
      filters.splice(filterIndex, 1)
    } else {
      filters.length = 0
    }

    filters = filters
  }

  const handleAllFiltersDeleted = () => {
    handleFilterDeleted()
  }

  const handleFiltersModified = (result: { [p: string]: any }, index?: number) => {
    const i = index === undefined ? filters.length : index
    const entries = Object.entries(result)

    if (entries.length !== 1) {
      return
    }

    const [filterKey, filterValue] = entries[0]

    if (filters[i]) {
      const { mode, query: currentFilterQuery } = filters[i]
      const currentFilterQueryConditions: any[] = currentFilterQuery[filterKey]?.[mode] ?? []

      if (currentFilterQueryConditions.includes(filterValue)) {
        const updatedFilterConditions = currentFilterQueryConditions.filter((x: any) => x !== filterValue)

        filters[i] = { mode, query: { [filterKey]: { [mode]: updatedFilterConditions } } }

        if (filters.length === 1 && updatedFilterConditions.length === 0) {
          filters.length = 0
        }
      } else {
        filters[i] = { mode, query: { [filterKey]: { $in: [...currentFilterQueryConditions, filterValue] } } }
      }
    } else {
      filters[i] = { mode: '$in', query: { [filterKey]: { $in: [filterValue] } } }
    }

    filters = filters
  }

  const handleFilterModeChanged = (index: number) => {
    if (!filters[index]) {
      return
    }

    const { mode: currentMode, query: currentQuery } = filters[index]
    const newMode = currentMode === '$in' ? '$nin' : '$in'
    const [filterKey, filterValue] = Object.entries(currentQuery)[0]

    filters[index] = { mode: newMode, query: { [filterKey]: { [newMode]: [...filterValue[currentMode]] } } }
  }

  const handleFiltersBackButtonPressed = (event: MouseEvent) => {
    dispatch('close')

    handleFilterMenuOpened(event, false)
  }

  const handleFilterMenuOpened = (event: MouseEvent, shouldUpdateFilterTargetElement: boolean = true) => {
    if (!currentSpace) {
      return
    }

    if (!filterElement || shouldUpdateFilterTargetElement) {
      filterElement = eventToHTMLElement(event)
    }

    showPopup(
      IssuesFilterMenu,
      {
        issues,
        filters: filters,
        index: filters.length,
        defaultStatuses: statuses,
        onBack: handleFiltersBackButtonPressed,
        targetHtml: filterElement,
        onUpdate: handleFiltersModified
      },
      filterElement
    )
  }
</script>

{#if currentTeam}
  <ScrollBox vertical stretch>
    <div class="fs-title flex-between header">
      <div class="titleContainer">
        {#if totalIssuesCount === resultIssuesCount}
          <Label label={title} params={{ value: totalIssuesCount }} />
        {:else}
          <div class="labelsContainer">
            <Label label={title} params={{ value: resultIssuesCount }} />
            <div class="totalIssuesLabel">/{totalIssuesCount}</div>
          </div>
        {/if}
        <div class="ml-3">
          <Button
            size="small"
            icon={isFiltersEmpty ? IconAdd : IconClose}
            kind={'link-bordered'}
            borderStyle={'dashed'}
            label={isFiltersEmpty ? tracker.string.Filter : tracker.string.ClearFilters}
            on:click={isFiltersEmpty ? handleFilterMenuOpened : handleAllFiltersDeleted}
          />
        </div>
      </div>
      <Button icon={IconOptions} kind={'link'} on:click={handleOptionsEditorOpened} />
    </div>
    {#if filters.length > 0}
      <div class="filterSummaryWrapper">
        <FilterSummary
          {filters}
          {issues}
          defaultStatuses={statuses}
          onAddFilter={handleFilterMenuOpened}
          onUpdateFilter={handleFiltersModified}
          onDeleteFilter={handleFilterDeleted}
          onChangeMode={handleFilterModeChanged}
        />
      </div>
    {/if}
    <IssuesListBrowser
      _class={tracker.class.Issue}
      {currentSpace}
      {groupByKey}
      orderBy={issuesOrderKeyMap[orderingKey]}
      {statuses}
      {employees}
      categories={displayedCategories}
      itemsConfig={[
        { key: '', presenter: tracker.component.PriorityEditor, props: { currentSpace } },
        { key: '', presenter: tracker.component.IssuePresenter, props: { currentTeam } },
        { key: '', presenter: tracker.component.StatusEditor, props: { currentSpace, statuses } },
        { key: '', presenter: tracker.component.TitlePresenter, props: { shouldUseMargin: true } },
        { key: '', presenter: tracker.component.DueDatePresenter, props: { currentSpace } },
        {
          key: '',
          presenter: tracker.component.ProjectEditor,
          props: {
            currentSpace,
            kind: 'secondary',
            size: 'small',
            shape: 'round',
            shouldShowPlaceholder: false
          }
        },
        { key: 'modifiedOn', presenter: tracker.component.ModificationDatePresenter },
        {
          key: '$lookup.assignee',
          presenter: tracker.component.AssigneePresenter,
          props: { currentSpace, defaultClass: contact.class.Employee, shouldShowLabel: false }
        }
      ]}
      {groupedIssues}
    />
  </ScrollBox>
{/if}

<style lang="scss">
  .header {
    min-height: 3.5rem;
    padding-left: 2.25rem;
    padding-right: 1.35rem;
  }

  .titleContainer {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .labelsContainer {
    display: flex;
    align-items: center;
  }

  .totalIssuesLabel {
    color: var(--content-color);
  }

  .filterSummaryWrapper {
    display: flex;
    align-items: center;
    min-height: 3.5rem;
    padding-left: 2.25rem;
    padding-right: 1.35rem;
    border-top: 1px solid var(--theme-button-border-hovered);
  }
</style>
