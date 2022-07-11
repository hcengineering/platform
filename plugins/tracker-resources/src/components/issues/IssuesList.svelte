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
  import contact, { Employee } from '@anticrm/contact'
  import { Class, Doc, FindOptions, getObjectValue, Ref, WithLookup } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, CheckBox, Component, eventToHTMLElement, IconAdd, showPopup, Spinner, tooltip } from '@anticrm/ui'
  import { AttributeModel, BuildModelKey } from '@anticrm/view'
  import { buildModel, getObjectPresenter, LoadingProps, Menu } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { IssuesGroupByKeys, issuesGroupEditorMap, IssuesOrderByKeys, issuesSortOrderMap } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'
  import notification from '@anticrm/notification'
  import { FixedColumn } from '@anticrm/view-resources'
  import { ExpandCollapse } from '@anticrm/ui'

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
      space: tracker.class.Team
    }
  }

  let personPresenter: AttributeModel

  $: isCollapsedMap = Object.fromEntries(categories.map((category) => [category, false]))
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

    showPopup(
      Menu,
      { object: items, baseMenuClass },
      {
        getBoundingClientRect: () => DOMRect.fromRect({ width: 1, height: 1, x: event.clientX, y: event.clientY })
      },
      () => {
        selectedRowIndex = undefined
      }
    )
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

  const handleCollapseCategory = (category: any) => (isCollapsedMap[category] = !isCollapsedMap[category])

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
</script>

<div class="issueslist-container" style={varsStyle}>
  {#each categories as category}
    {#if headerComponent || groupByKey === 'assignee'}
      <div class="flex-between categoryHeader row" on:click={() => handleCollapseCategory(category)}>
        <div class="flex-row-center gap-2 clear-mins">
          {#if groupByKey === 'assignee' && personPresenter}
            <svelte:component
              this={personPresenter.presenter}
              shouldShowLabel={true}
              value={employees.find((x) => x?._id === category)}
              defaultName={tracker.string.NoAssignee}
              shouldShowPlaceholder={true}
              isInteractive={false}
              avatarSize={'x-small'}
            />
          {:else if headerComponent}
            <Component
              is={headerComponent}
              props={{
                isEditable: false,
                shouldShowLabel: true,
                value: groupByKey ? { [groupByKey]: category } : {},
                statuses: groupByKey === 'status' ? statuses : undefined,
                size: 'inline',
                kind: 'list'
              }}
            />
          {/if}
          <span class="text-md content-dark-color ml-2">{(groupedIssues[category] ?? []).length}</span>
        </div>
        <div class="clear-mins" use:tooltip={{ label: tracker.string.AddIssueTooltip }}>
          <Button icon={IconAdd} kind={'transparent'} on:click={(event) => handleNewIssueAdded(event, category)} />
        </div>
      </div>
    {/if}
    <ExpandCollapse isExpanded={!isCollapsedMap[category]} duration={400}>
      {#if itemModels}
        {#if groupedIssues[category]}
          {#each groupedIssues[category] as docObject (docObject._id)}
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
                    props={{ value: docObject, kind: 'table' }}
                  />
                </div>
              </div>
              {#each itemModels as attributeModel, attributeModelIndex}
                {#if attributeModelIndex === 0}
                  <div class="priorityPresenter">
                    <svelte:component
                      this={attributeModel.presenter}
                      value={getObjectValue(attributeModel.key, docObject) ?? ''}
                      {...attributeModel.props}
                    />
                  </div>
                {:else if attributeModelIndex === 1}
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
                        {...attributeModel.props}
                      />
                    </FixedColumn>
                  </div>
                {:else if attributeModelIndex === 3}
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject) ?? ''}
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
                      {...attributeModel.props}
                    />
                  </FixedColumn>
                {:else}
                  <div class="gridElement">
                    <svelte:component
                      this={attributeModel.presenter}
                      value={getObjectValue(attributeModel.key, docObject) ?? ''}
                      issueId={docObject._id}
                      {...attributeModel.props}
                    />
                  </div>
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
    padding: 0 1.5rem 0 2.25rem;
    height: 2.5rem;
    min-height: 2.5rem;
    min-width: 0;
    background-color: var(--body-accent);
    z-index: 5;
  }

  .row:not(:last-child) {
    border-bottom: 1px solid var(--accent-bg-color);
  }

  .listGrid {
    display: flex;
    align-items: center;
    padding: 0 1.5rem 0 0.875rem;
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
    min-width: 0;
    min-height: 0;
  }
  // .grow-cell {
  //   flex-grow: 1;
  //   flex-shrink: 0;
  //   min-width: 0;
  // }
</style>
