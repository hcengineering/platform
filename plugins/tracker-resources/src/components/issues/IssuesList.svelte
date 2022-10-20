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
  import { Class, Doc, FindOptions, getObjectValue, Ref, WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
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
    showPopup,
    Spinner,
    tooltip
  } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey } from '@hcengineering/view'
  import { buildModel, FixedColumn, getObjectPresenter, LoadingProps, Menu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { IssuesGroupByKeys, issuesGroupEditorMap, IssuesOrderByKeys, issuesSortOrderMap } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'

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

  const spaceQuery = createQuery()
  let currentTeam: Team | undefined
  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  let personPresenter: AttributeModel

  const defaultLimit = 20
  const autoFoldLimit = 20
  const singleCategoryLimit = 200

  const isCollapsedMap: Record<any, boolean> = {}

  const noCategory = '#no_category'

  $: {
    const exkeys = new Set(Object.keys(isCollapsedMap))
    for (const c of categories) {
      if (!exkeys.delete(toCat(c))) {
        isCollapsedMap[toCat(c)] = categories.length === 1 ? false : (groupedIssues[c]?.length ?? 0) > autoFoldLimit
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

  const handleMenuOpened = async (event: MouseEvent, object: Doc, rowIndex: number) => {
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

  export const onElementSelected = (offset: 1 | -1 | 0, docObject?: Doc) => {
    let position =
      (docObject !== undefined ? combinedGroupedIssues.findIndex((x) => x._id === docObject?._id) : selectedRowIndex) ??
      -1

    position += offset

    if (position < 0) {
      position = 0
    }

    if (position >= combinedGroupedIssues.length) {
      position = combinedGroupedIssues.length - 1
    }

    const objectRef = objectRefs[position]

    selectedRowIndex = position

    handleRowFocused(combinedGroupedIssues[position])

    if (objectRef) {
      objectRef.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
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

  let varsStyle: string = ''
  const propsWidth: Record<string, number> = { issue: 0 }
  let itemModels: AttributeModel[]
  $: buildModel({ client, _class, keys: itemsConfig, lookup: options.lookup }).then((res) => (itemModels = res))
  $: if (propsWidth) {
    varsStyle = ''
    for (const key in propsWidth) varsStyle += `--fixed-${key}: ${propsWidth[key]}px;`
  }
  const checkWidth = (key: string, result: CustomEvent): void => {
    if (result !== undefined) propsWidth[key] = result.detail
  }
  function limitGroup (
    category: any,
    groupes: { [key: string | number | symbol]: Issue[] },
    categoryLimit: Record<any, number>
  ): Issue[] {
    const issues = groupes[category] ?? []
    if (Object.keys(groupes).length === 1) {
      return issues.slice(0, singleCategoryLimit)
    }
    const limit = categoryLimit[toCat(category)] ?? defaultLimit
    return issues.slice(0, limit)
  }
  const categoryLimit: Record<any, number> = {}
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
            <div
              bind:this={objectRefs[combinedGroupedIssues.findIndex((x) => x === docObject)]}
              class="listGrid antiList__row row gap-2 flex-grow"
              class:checking={selectedObjectIdsSet.has(docObject._id)}
              class:mListGridFixed={selectedRowIndex === combinedGroupedIssues.findIndex((x) => x === docObject)}
              class:mListGridSelected={selectedRowIndex === combinedGroupedIssues.findIndex((x) => x === docObject)}
              on:contextmenu|preventDefault={(event) =>
                handleMenuOpened(
                  event,
                  docObject,
                  combinedGroupedIssues.findIndex((x) => x === docObject)
                )}
              on:focus={() => {}}
              on:mouseover={() => handleRowFocused(docObject)}
            >
              <div
                class="flex-center relative"
                use:tooltip={{ label: tracker.string.SelectIssue, direction: 'bottom' }}
              >
                <div class="antiList-cells__notifyCell">
                  <div class="antiList-cells__checkCell">
                    <CheckBox
                      checked={selectedObjectIdsSet.has(docObject._id)}
                      on:value={(event) => {
                        onObjectChecked([docObject], event.detail)
                      }}
                    />
                  </div>
                  <Component
                    is={notification.component.NotificationPresenter}
                    showLoading={false}
                    props={{ value: docObject, kind: 'table' }}
                  />
                </div>
              </div>
              {#each itemModels as attributeModel}
                {#if attributeModel.props?.type === 'priority'}
                  <div class="priorityPresenter">
                    <svelte:component
                      this={attributeModel.presenter}
                      value={getObjectValue(attributeModel.key, docObject) ?? ''}
                      groupBy={groupByKey}
                      {...attributeModel.props}
                      {statuses}
                      {currentTeam}
                    />
                  </div>
                {:else if attributeModel.props?.type === 'issue'}
                  <div class="issuePresenter">
                    <FixedColumn
                      width={propsWidth.issue}
                      key={'issue'}
                      justify={'left'}
                      on:update={(result) => checkWidth('issue', result)}
                    >
                      <svelte:component
                        this={attributeModel.presenter}
                        value={getObjectValue(attributeModel.key, docObject) ?? ''}
                        groupBy={groupByKey}
                        {...attributeModel.props}
                        {statuses}
                        {currentTeam}
                      />
                    </FixedColumn>
                  </div>
                {:else if attributeModel.props?.type === 'grow'}
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject) ?? ''}
                    groupBy={groupByKey}
                    {...attributeModel.props}
                  />
                {:else if attributeModel.props?.fixed}
                  <FixedColumn
                    width={propsWidth[attributeModel.key]}
                    key={attributeModel.key}
                    justify={attributeModel.props.fixed}
                    on:update={(result) => checkWidth(attributeModel.key, result)}
                  >
                    <svelte:component
                      this={attributeModel.presenter}
                      value={getObjectValue(attributeModel.key, docObject) ?? ''}
                      groupBy={groupByKey}
                      {...attributeModel.props}
                      {statuses}
                      {currentTeam}
                    />
                  </FixedColumn>
                {:else}
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject) ?? ''}
                    issueId={docObject._id}
                    groupBy={groupByKey}
                    {...attributeModel.props}
                    {statuses}
                    {currentTeam}
                  />
                {/if}
              {/each}
            </div>
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

  .listGrid {
    display: flex;
    align-items: center;
    padding: 0 0.75rem 0 0.875rem;
    width: 100%;
    height: 2.75rem;
    min-height: 2.75rem;
    color: var(--theme-caption-color);

    &.checking {
      background-color: var(--highlight-select);
      border-bottom-color: var(--highlight-select);

      &:hover {
        background-color: var(--highlight-select-hover);
        border-bottom-color: var(--highlight-select-hover);
      }
    }

    &.mListGridSelected {
      background-color: var(--highlight-hover);
    }
  }

  .priorityPresenter,
  .issuePresenter {
    // min-width: 0;
    min-height: 0;
  }
</style>
