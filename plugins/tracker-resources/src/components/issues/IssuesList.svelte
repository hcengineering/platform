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
  import contact, { Employee } from '@hcengineering/contact'
  import { Class, Doc, FindOptions, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import ui, {
    ActionIcon,
    Button,
    CheckBox,
    Component,
    eventToHTMLElement,
    ExpandCollapse,
    getEventPositionElement,
    IconAdd,
    IconMoreH,
    Label,
    showPopup,
    Spinner
  } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey } from '@hcengineering/view'
  import { buildModel, filterStore, getObjectPresenter, LoadingProps, Menu } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { IssuesGroupByKeys, issuesGroupEditorMap, IssuesOrderByKeys, issuesSortOrderMap } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'
  import IssuesListItem from './IssuesListItem.svelte'

  export let _class: Ref<Class<Doc>>
  export let currentSpace: Ref<Team> | undefined = undefined
  export let groupByKey: IssuesGroupByKeys | undefined = undefined
  export let orderBy: IssuesOrderByKeys
  export let statuses: WithLookup<IssueStatus>[]
  export let employees: (WithLookup<Employee> | undefined)[] = []
  export let categories: any[] = []
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let itemsConfig: (BuildModelKey | string)[]
  export let selectedObjectIds: Doc[] = []
  export let selectedRowIndex: number | undefined = undefined
  export let groupedIssues: { [key: string | number | symbol]: Issue[] } = {}
  export let loadingProps: LoadingProps | undefined = undefined

  const dispatch = createEventDispatcher()

  const client = getClient()
  const objectRefs: HTMLElement[] = []
  const baseOptions: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee,
      status: tracker.class.IssueStatus,
      space: tracker.class.Team,
      _id: {
        subIssues: tracker.class.Issue
      }
    }
  }
  const categoryLimit: Record<any, number> = {}
  const spaceQuery = createQuery()
  const defaultLimit = 20
  const autoFoldLimit = 20
  const singleCategoryLimit = 200
  const noCategory = '#no_category'

  let currentTeam: Team | undefined
  let personPresenter: AttributeModel
  let isCollapsedMap: Record<any, boolean> = {}
  let varsStyle: string = ''
  let propsWidth: Record<string, number> = {}
  let itemModels: AttributeModel[]
  let isFilterUpdate = false
  let groupedIssuesBeforeFilter = groupedIssues

  const handleMenuOpened = async (event: MouseEvent, object: Doc, rowIndex: number) => {
    event.preventDefault()
    selectedRowIndex = rowIndex

    if (!selectedObjectIdsSet.has(object._id)) {
      onObjectChecked(combinedGroupedIssues, false)

      selectedObjectIds = []
    }

    const items = selectedObjectIds.length > 0 ? selectedObjectIds : object

    showPopup(Menu, { object: items, baseMenuClass }, getEventPositionElement(event), () => {
      selectedRowIndex = undefined
    })
  }

  export const onObjectChecked = (docs: Doc[], value: boolean) => {
    dispatch('check', { docs, value })
  }

  const handleRowFocused = (object: Doc) => {
    dispatch('row-focus', object)
  }

  const handleNewIssueAdded = (event: MouseEvent, category: any) => {
    if (!currentSpace) {
      return
    }

    showPopup(
      CreateIssue,
      { space: currentSpace, ...(groupByKey ? { [groupByKey]: category } : {}) },
      eventToHTMLElement(event)
    )
  }

  function toCat (category: any): any {
    return category ?? noCategory
  }

  const handleCollapseCategory = (category: any) => {
    isCollapsedMap[category] = !isCollapsedMap[category]
  }

  const getLoadingElementsLength = (props: LoadingProps, options?: FindOptions<Doc>) => {
    if (options?.limit && options?.limit > 0) {
      return Math.min(options.limit, props.length)
    }

    return props.length
  }

  function limitGroup (
    category: any,
    groupes: { [key: string | number | symbol]: Issue[] },
    categoryLimit: Record<any, number>
  ): Issue[] {
    const issues = groupes[category] ?? []
    const initialLimit = Object.keys(groupes).length === 1 ? singleCategoryLimit : defaultLimit
    const limit = categoryLimit[toCat(category)] ?? initialLimit
    return issues.slice(0, limit)
  }

  const getInitCollapseValue = (category: any) =>
    categories.length === 1 ? false : (groupedIssues[category]?.length ?? 0) > autoFoldLimit

  const unsubscribeFilter = filterStore.subscribe(() => (isFilterUpdate = true))
  onDestroy(unsubscribeFilter)

  $: {
    if (isFilterUpdate && groupedIssuesBeforeFilter !== groupedIssues) {
      isCollapsedMap = {}

      categories.forEach((category) => (isCollapsedMap[toCat(category)] = getInitCollapseValue(category)))

      isFilterUpdate = false
      groupedIssuesBeforeFilter = groupedIssues
    }
  }

  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })
  $: {
    const exkeys = new Set(Object.keys(isCollapsedMap))
    for (const c of categories) {
      if (!exkeys.delete(toCat(c))) {
        isCollapsedMap[toCat(c)] = getInitCollapseValue(c)
      }
    }
    for (const k of exkeys) {
      delete isCollapsedMap[k]
    }
  }
  $: combinedGroupedIssues = Object.values(groupedIssues).flat(1)
  $: options = { ...baseOptions, sort: { [orderBy]: issuesSortOrderMap[orderBy] } } as FindOptions<Issue>
  $: headerComponent = groupByKey === undefined || groupByKey === 'assignee' ? null : issuesGroupEditorMap[groupByKey]
  $: selectedObjectIdsSet = new Set<Ref<Doc>>(selectedObjectIds.map((it) => it._id))
  $: objectRefs.length = combinedGroupedIssues.length
  $: getObjectPresenter(client, contact.class.Person, { key: '' }).then((p) => {
    personPresenter = p
  })
  $: buildModel({ client, _class, keys: itemsConfig, lookup: options.lookup }).then((res) => (itemModels = res))
  $: if (itemModels) {
    for (const item of itemModels) if (item.props?.fixed !== undefined) propsWidth[item.key] = 0
  }
  $: if (propsWidth) {
    varsStyle = ''
    for (const key in propsWidth) varsStyle += `--fixed-${key}: ${propsWidth[key]}px;`
  }
</script>

<div class="issueslist-container" style={varsStyle}>
  {#each categories as category}
    {@const items = groupedIssues[category] ?? []}
    {@const limited = limitGroup(category, groupedIssues, categoryLimit) ?? []}
    {#if headerComponent || groupByKey === 'assignee' || category === undefined}
      <div class="flex-between categoryHeader row" on:click={() => handleCollapseCategory(toCat(category))}>
        <div class="flex-row-center gap-2 clear-mins">
          {#if groupByKey === 'assignee' && personPresenter}
            <svelte:component
              this={personPresenter.presenter}
              shouldShowLabel={true}
              value={employees.find((x) => x?._id === category)}
              defaultName={tracker.string.NoAssignee}
              shouldShowPlaceholder={true}
              isInteractive={false}
              avatarSize={'small'}
              enlargedText
              {currentSpace}
            />
          {:else if !groupByKey}
            <span class="text-base fs-bold overflow-label content-accent-color pointer-events-none">
              <Label label={tracker.string.NoGrouping} />
            </span>
          {:else if headerComponent}
            <Component
              is={headerComponent}
              props={{
                isEditable: false,
                shouldShowLabel: true,
                value: groupByKey ? { [groupByKey]: category } : {},
                statuses: groupByKey === 'status' ? statuses : undefined,
                issues: groupedIssues[category],
                width: 'min-content',
                kind: 'list-header',
                enlargedText: true,
                currentSpace
              }}
            />
          {/if}
          {#if limited.length < items.length}
            <div class="counter">
              {limited.length}
              <div class="text-xs mx-1">/</div>
              {items.length}
            </div>
            <ActionIcon
              size={'small'}
              icon={IconMoreH}
              label={ui.string.ShowMore}
              action={() => {
                categoryLimit[toCat(category)] = limited.length + 20
              }}
            />
          {:else}
            <span class="counter">{items.length}</span>
          {/if}
        </div>
        <Button
          icon={IconAdd}
          kind={'transparent'}
          showTooltip={{ label: tracker.string.AddIssueTooltip }}
          on:click={(event) => handleNewIssueAdded(event, category)}
        />
      </div>
    {/if}
    <ExpandCollapse isExpanded={!isCollapsedMap[toCat(category)]} duration={400}>
      {#if itemModels}
        {#if groupedIssues[category]}
          {#each limited as docObject (docObject._id)}
            <IssuesListItem
              bind:use={objectRefs[combinedGroupedIssues.findIndex((x) => x === docObject)]}
              {docObject}
              model={itemModels}
              {groupByKey}
              selected={selectedRowIndex === combinedGroupedIssues.findIndex((x) => x === docObject)}
              checked={selectedObjectIdsSet.has(docObject._id)}
              {statuses}
              {currentTeam}
              {propsWidth}
              on:fitting={(ev) => {
                if (ev.detail !== undefined) propsWidth = ev.detail
              }}
              on:check={(ev) => dispatch('check', { docs: ev.detail.docs, value: ev.detail.value })}
              on:contextmenu={(event) =>
                handleMenuOpened(
                  event,
                  docObject,
                  combinedGroupedIssues.findIndex((x) => x === docObject)
                )}
              on:focus={() => {}}
              on:mouseover={() => handleRowFocused(docObject)}
            />
          {/each}
        {:else if loadingProps !== undefined}
          {#each Array(getLoadingElementsLength(loadingProps, options)) as _, rowIndex}
            <div class="listGrid row" class:fixed={rowIndex === selectedRowIndex}>
              <div class="flex-center clear-mins h-full">
                <div class="gridElement">
                  <CheckBox checked={false} />
                  <div class="ml-4">
                    <Spinner size="small" />
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      {/if}
    </ExpandCollapse>
  {/each}
</div>

<style lang="scss">
  .issueslist-container {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: max-content;
    min-width: auto;
    min-height: auto;
  }
  .categoryHeader {
    position: sticky;
    top: 0;
    padding: 0 0.75rem 0 2.25rem;
    height: 3rem;
    min-height: 3rem;
    min-width: 0;
    background: var(--header-bg-color);
    z-index: 5;
  }

  .row:not(:last-child) {
    border-bottom: 1px solid var(--accent-bg-color);
  }

  .counter {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    flex-shrink: 0;
    margin-left: 1rem;
    padding: 0.25rem 0.5rem;
    min-width: 1.325rem;
    text-align: center;
    font-weight: 500;
    font-size: 1rem;
    line-height: 1rem;
    color: var(--accent-color);
    background-color: var(--body-color);
    border: 1px solid var(--divider-color);
    border-radius: 1rem;
  }
</style>
