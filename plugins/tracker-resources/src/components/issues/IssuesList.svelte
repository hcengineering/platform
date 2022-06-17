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
  import {
    Button,
    CheckBox,
    Component,
    eventToHTMLElement,
    IconAdd,
    showPopup,
    Spinner,
    tooltip,
    Tooltip
  } from '@anticrm/ui'
  import { AttributeModel, BuildModelKey } from '@anticrm/view'
  import { buildModel, getObjectPresenter, LoadingProps, Menu } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { IssuesGroupByKeys, issuesGroupEditorMap, IssuesOrderByKeys, issuesSortOrderMap } from '../../utils'
  import CreateIssue from '../CreateIssue.svelte'
  import notification from '@anticrm/notification'

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

  const getLoadingElementsLength = (props: LoadingProps, options?: FindOptions<Doc>) => {
    if (options?.limit && options?.limit > 0) {
      return Math.min(options.limit, props.length)
    }

    return props.length
  }
</script>

<div>
  {#each categories as category}
    {#if headerComponent || groupByKey === 'assignee'}
      <div class="header categoryHeader flex-between label">
        <div class="flex-row-center gap-2">
          {#if groupByKey === 'assignee' && personPresenter}
            <svelte:component
              this={personPresenter.presenter}
              shouldShowLabel={true}
              value={employees.find((x) => x?._id === category)}
              defaultName={tracker.string.NoAssignee}
              shouldShowPlaceholder={true}
              isInteractive={false}
              avatarSize={'tiny'}
            />
          {:else if headerComponent}
            <Component
              is={headerComponent}
              props={{
                isEditable: false,
                shouldShowLabel: true,
                value: groupByKey ? { [groupByKey]: category } : {},
                statuses: groupByKey === 'status' ? statuses : undefined
              }}
            />
          {/if}
          <span class="eLabelCounter ml-2">{(groupedIssues[category] ?? []).length}</span>
        </div>
        <div class="flex">
          <Tooltip label={tracker.string.AddIssueTooltip} direction={'left'}>
            <Button icon={IconAdd} kind={'transparent'} on:click={(event) => handleNewIssueAdded(event, category)} />
          </Tooltip>
        </div>
      </div>
    {/if}
    {#await buildModel({ client, _class, keys: itemsConfig, lookup: options.lookup }) then itemModels}
      <div class="listRoot">
        {#if groupedIssues[category]}
          {#each groupedIssues[category] as docObject (docObject._id)}
            <div
              bind:this={objectRefs[combinedGroupedIssues.findIndex((x) => x === docObject)]}
              class="listGrid antiList__row"
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
              <div class="contentWrapper">
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
                        width="100%"
                        {...attributeModel.props}
                      />
                    </div>
                  {:else if attributeModelIndex === 1}
                    <div class="issuePresenter">
                      <svelte:component
                        this={attributeModel.presenter}
                        value={getObjectValue(attributeModel.key, docObject) ?? ''}
                        {...attributeModel.props}
                      />
                    </div>
                  {:else if attributeModelIndex === 3}
                    <svelte:component
                      this={attributeModel.presenter}
                      value={getObjectValue(attributeModel.key, docObject) ?? ''}
                      {...attributeModel.props}
                    />
                    <div class="filler" />
                  {:else}
                    <div class="gridElement">
                      <svelte:component
                        this={attributeModel.presenter}
                        value={getObjectValue(attributeModel.key, docObject) ?? ''}
                        issueId={docObject._id}
                        width="100%"
                        {...attributeModel.props}
                      />
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        {:else if loadingProps !== undefined}
          {#each Array(getLoadingElementsLength(loadingProps, options)) as _, rowIndex}
            <div class="listGrid" class:fixed={rowIndex === selectedRowIndex}>
              <div class="contentWrapper">
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
      </div>
    {/await}
  {/each}
</div>

<style lang="scss">
  .categoryHeader {
    height: 2.5rem;
    background-color: var(--theme-table-bg-hover);
    padding-left: 2.25rem;
    padding-right: 1.35rem;
  }

  .label {
    font-weight: 500;
    color: var(--theme-caption-color);
    .eLabelCounter {
      opacity: 0.8;
      font-weight: initial;
    }
  }

  .listRoot {
    width: 100%;
  }

  .contentWrapper {
    display: flex;
    align-items: center;
    height: 100%;
    padding-left: 0.75rem;
    padding-right: 1.15rem;
  }

  .listGrid {
    width: 100%;
    height: 3.25rem;
    color: var(--theme-caption-color);
    border-bottom: 1px solid var(--theme-button-border-hovered);

    &.checking {
      background-color: var(--theme-table-bg-hover);
    }

    &.mListGridSelected {
      background-color: var(--menu-bg-select);
    }
  }

  .filler {
    display: flex;
    flex-grow: 1;
  }

  .gridElement {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-left: 0.5rem;

    &:first-child {
      margin-left: 0;
    }
  }

  .priorityPresenter {
    padding-left: 0.65rem;
  }

  .issuePresenter {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    // width: 5.5rem;
  }
</style>
