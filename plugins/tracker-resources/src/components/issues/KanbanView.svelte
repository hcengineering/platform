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
  import { employeeByIdStore } from '@hcengineering/contact-resources'
  import {
    CategoryType,
    Class,
    Doc,
    DocumentQuery,
    DocumentUpdate,
    generateId,
    Lookup,
    Ref,
    WithLookup
  } from '@hcengineering/core'
  import { Item, Kanban } from '@hcengineering/kanban'
  import notification from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient, statusStore } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { Issue, IssuesGrouping, IssuesOrdering, Project } from '@hcengineering/tracker'
  import {
    Button,
    Component,
    getEventPositionElement,
    IconAdd,
    Label,
    Loading,
    showPanel,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import {
    AttributeModel,
    CategoryOption,
    Viewlet,
    ViewOptionModel,
    ViewOptions,
    ViewQueryOption
  } from '@hcengineering/view'
  import {
    ActionContext,
    focusStore,
    getCategories,
    getGroupByValues,
    getPresenter,
    groupBy,
    ListSelectionProvider,
    Menu,
    noCategory,
    SelectDirection,
    selectionStore,
    setGroupByValues
  } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { onMount } from 'svelte'
  import tracker from '../../plugin'
  import ComponentEditor from '../components/ComponentEditor.svelte'
  import CreateIssue from '../CreateIssue.svelte'
  import AssigneePresenter from './AssigneePresenter.svelte'
  import SubIssuesSelector from './edit/SubIssuesSelector.svelte'
  import IssuePresenter from './IssuePresenter.svelte'
  import ParentNamesPresenter from './ParentNamesPresenter.svelte'
  import PriorityEditor from './PriorityEditor.svelte'
  import StatusEditor from './StatusEditor.svelte'
  import EstimationEditor from './timereport/EstimationEditor.svelte'

  export let space: Ref<Project> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let query: DocumentQuery<Issue> = {}
  export let viewOptionsConfig: ViewOptionModel[] | undefined
  export let viewOptions: ViewOptions
  export let viewlet: Viewlet

  $: currentSpace = space || tracker.project.DefaultProject
  $: groupByKey = (viewOptions.groupBy[0] ?? noCategory) as IssuesGrouping
  $: orderBy = viewOptions.orderBy
  $: sort = { [orderBy[0]]: orderBy[1] }

  // issuesGroupBySorting[groupByKey]

  $: dontUpdateRank = orderBy[0] !== IssuesOrdering.Manual

  const spaceQuery = createQuery()

  let currentProject: Project | undefined
  $: spaceQuery.query(tracker.class.Project, { _id: currentSpace }, (res) => {
    currentProject = res.shift()
  })

  let resultQuery: DocumentQuery<any> = query
  $: getResultQuery(query, viewOptionsConfig, viewOptions).then((p) => (resultQuery = p))

  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function getResultQuery (
    query: DocumentQuery<Issue>,
    viewOptions: ViewOptionModel[] | undefined,
    viewOptionsStore: ViewOptions
  ): Promise<DocumentQuery<Issue>> {
    if (viewOptions === undefined) return query
    let result = hierarchy.clone(query)
    for (const viewOption of viewOptions) {
      if (viewOption.actionTarget !== 'query') continue
      const queryOption = viewOption as ViewQueryOption
      const f = await getResource(queryOption.action)
      result = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, query)
    }
    return result
  }

  function toIssue (object: any): WithLookup<Issue> {
    return object as WithLookup<Issue>
  }

  const lookup: Lookup<Issue> = {
    assignee: contact.class.Employee,
    space: tracker.class.Project,
    status: tracker.class.IssueStatus,
    component: tracker.class.Component,
    sprint: tracker.class.Sprint,
    _id: {
      subIssues: tracker.class.Issue,
      labels: tags.class.TagReference
    }
  }

  let kanbanUI: Kanban
  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    kanbanUI.select(offset, of, dir)
  })
  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })

  const showMenu = async (ev: MouseEvent, items: Doc[]): Promise<void> => {
    ev.preventDefault()
    showPopup(Menu, { object: items, baseMenuClass }, getEventPositionElement(ev), () => {
      // selection = undefined
    })
  }
  const issuesQuery = createQuery()
  let issues: Issue[] = []

  $: groupByDocs = groupBy(issues, groupByKey, categories)

  $: issuesQuery.query(
    tracker.class.Issue,
    resultQuery,
    (result) => {
      issues = result
    },
    {
      lookup,
      sort
    }
  )

  let categories: CategoryType[] = []

  const queryId = generateId()

  $: updateCategories(tracker.class.Issue, issues, groupByKey, viewOptions, viewOptionsConfig)

  function update () {
    updateCategories(tracker.class.Issue, issues, groupByKey, viewOptions, viewOptionsConfig)
  }

  async function updateCategories (
    _class: Ref<Class<Doc>>,
    docs: Doc[],
    groupByKey: string,
    viewOptions: ViewOptions,
    viewOptionsModel: ViewOptionModel[] | undefined
  ) {
    categories = await getCategories(client, _class, docs, groupByKey, $statusStore, viewlet.descriptor)
    for (const viewOption of viewOptionsModel ?? []) {
      if (viewOption.actionTarget !== 'category') continue
      const categoryFunc = viewOption as CategoryOption
      if (viewOptions[viewOption.key] ?? viewOption.defaultValue) {
        const categoryAction = await getResource(categoryFunc.action)
        const res = await categoryAction(_class, space, groupByKey, update, queryId, $statusStore, viewlet.descriptor)
        if (res !== undefined) {
          categories = res
          break
        }
      }
    }
  }

  const fullFilled: { [key: string]: boolean } = {}

  function getHeader (_class: Ref<Class<Doc>>, groupByKey: string): void {
    if (groupByKey === noCategory) {
      headerComponent = undefined
    } else {
      getPresenter(client, _class, { key: groupByKey }, { key: groupByKey }).then((p) => (headerComponent = p))
    }
  }

  let headerComponent: AttributeModel | undefined
  $: getHeader(tracker.class.Issue, groupByKey)

  const getUpdateProps = (doc: Doc, category: CategoryType): DocumentUpdate<Item> | undefined => {
    const groupValue =
      typeof category === 'object' ? category.values.find((it) => it.space === doc.space)?._id : category
    if (groupValue === undefined) {
      return undefined
    }
    return {
      [groupByKey]: groupValue,
      space: doc.space
    }
  }
</script>

{#if categories.length === 0}}
  <Loading />
{:else}
  <ActionContext
    context={{
      mode: 'browser'
    }}
  />
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <Kanban
    bind:this={kanbanUI}
    {categories}
    {dontUpdateRank}
    objects={issues}
    getGroupByValues={(groupByDocs, category) =>
      groupByKey === noCategory ? issues : getGroupByValues(groupByDocs, category)}
    {setGroupByValues}
    {getUpdateProps}
    {groupByDocs}
    on:content={(evt) => {
      listProvider.update(evt.detail)
    }}
    on:obj-focus={(evt) => {
      listProvider.updateFocus(evt.detail)
    }}
    selection={listProvider.current($focusStore)}
    checked={$selectionStore ?? []}
    on:check={(evt) => {
      listProvider.updateSelection(evt.detail.docs, evt.detail.value)
    }}
    on:contextmenu={(evt) => showMenu(evt.detail.evt, evt.detail.objects)}
  >
    <svelte:fragment slot="header" let:state let:count>
      <!-- {@const status = $statusStore.get(state._id)} -->
      <div class="header flex-col">
        <div class="flex-row-center flex-between">
          <div class="flex-row-center gap-1">
            {#if groupByKey === noCategory}
              <span class="text-base fs-bold overflow-label content-accent-color pointer-events-none">
                <Label label={view.string.NoGrouping} />
              </span>
            {:else if headerComponent}
              <svelte:component this={headerComponent.presenter} value={state} {space} kind={'list-header'} />
            {/if}
            <span class="ml-1">
              {count}
            </span>
          </div>
          <div class="flex-row-center gap-1">
            <Button
              icon={IconAdd}
              kind={'transparent'}
              showTooltip={{ label: tracker.string.AddIssueTooltip, direction: 'left' }}
              on:click={() => {
                showPopup(CreateIssue, { space: currentSpace, [groupByKey]: state._id }, 'top')
              }}
            />
          </div>
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object>
      {@const issue = toIssue(object)}
      {@const issueId = object._id}
      {#key issueId}
        <div
          class="tracker-card"
          on:click={() => {
            showPanel(tracker.component.EditIssue, object._id, object._class, 'content')
          }}
        >
          <div class="flex-col ml-4 mr-8">
            <div class="flex clear-mins names">
              <IssuePresenter value={issue} />
              <ParentNamesPresenter value={issue} />
            </div>
            <div class="flex-row-center gap-1 mt-1">
              {#if groupByKey !== 'status'}
                <StatusEditor value={issue} kind="list" isEditable={false} />
              {/if}
              <span class="fs-bold caption-color lines-limit-2">
                {object.title}
              </span>
            </div>
          </div>
          <div class="abs-rt-content">
            <AssigneePresenter
              value={issue.assignee ? $employeeByIdStore.get(issue.assignee) : null}
              defaultClass={contact.class.Employee}
              object={issue}
              isEditable={true}
            />
            <div class="flex-center mt-2">
              <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
            </div>
          </div>
          <div class="buttons-group xsmall-gap states-bar">
            {#if issue && issue.subIssues > 0}
              <SubIssuesSelector value={issue} {currentProject} />
            {/if}
            <PriorityEditor value={issue} isEditable={true} kind={'link-bordered'} size={'inline'} justify={'center'} />
            <ComponentEditor
              value={issue}
              isEditable={true}
              kind={'link-bordered'}
              size={'inline'}
              justify={'center'}
              width={''}
              bind:onlyIcon={fullFilled[issueId]}
            />
            <EstimationEditor kind={'list'} size={'small'} value={issue} />
            <div
              class="clear-mins"
              use:tooltip={{
                component: fullFilled[issueId] ? tags.component.LabelsPresenter : undefined,
                props: { object: issue, kind: 'full' }
              }}
            >
              <Component
                is={tags.component.LabelsPresenter}
                props={{ object: issue, ckeckFilled: fullFilled[issueId], lookupField: 'labels' }}
                on:change={(res) => {
                  if (res.detail.full) fullFilled[issueId] = true
                }}
              />
            </div>
          </div>
        </div>
      {/key}
    </svelte:fragment>
  </Kanban>
{/if}

<style lang="scss">
  .names {
    font-size: 0.8125rem;
  }

  .header {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--divider-color);

    .label {
      color: var(--caption-color);
      .counter {
        color: rgba(var(--caption-color), 0.8);
      }
    }
  }
  .tracker-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    // padding: 0.5rem 1rem;
    min-height: 6.5rem;
  }
  .states-bar {
    flex-shrink: 10;
    width: fit-content;
    margin: 0.625rem 1rem 0;
  }
</style>
