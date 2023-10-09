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
  import { AttachmentsPresenter } from '@hcengineering/attachment-resources'
  import { CommentsPresenter } from '@hcengineering/chunter-resources'
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
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { Issue, IssuesGrouping, IssuesOrdering, Project } from '@hcengineering/tracker'
  import {
    Button,
    ColorDefinition,
    Component,
    defaultBackground,
    getEventPositionElement,
    IconAdd,
    Label,
    Loading,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import {
    AttributeModel,
    BuildModelKey,
    CategoryOption,
    Viewlet,
    ViewOptionModel,
    ViewOptions,
    ViewQueryOption
  } from '@hcengineering/view'
  import {
    enabledConfig,
    focusStore,
    getCategories,
    getCategorySpaces,
    getGroupByValues,
    getPresenter,
    groupBy,
    ListSelectionProvider,
    Menu,
    noCategory,
    openDoc,
    SelectDirection,
    selectionStore,
    setGroupByValues
  } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { onMount } from 'svelte'
  import tracker from '../../plugin'
  import ComponentEditor from '../components/ComponentEditor.svelte'
  import CreateIssue from '../CreateIssue.svelte'
  import AssigneeEditor from './AssigneeEditor.svelte'
  import DueDatePresenter from './DueDatePresenter.svelte'
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
  export let config: (string | BuildModelKey)[]

  $: currentSpace = space || tracker.project.DefaultProject
  $: groupByKey = (viewOptions.groupBy[0] ?? noCategory) as IssuesGrouping
  $: orderBy = viewOptions.orderBy
  $: sort = { [orderBy[0]]: orderBy[1] }

  let accentColors: Map<string, ColorDefinition> = new Map()
  const setAccentColor = (n: number, ev: CustomEvent<ColorDefinition>) => {
    accentColors.set(`${n}${$themeStore.dark}${groupByKey}`, ev.detail)
    accentColors = accentColors
  }

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
    space: tracker.class.Project,
    status: tracker.class.IssueStatus,
    component: tracker.class.Component,
    milestone: tracker.class.Milestone,
    _id: {
      subIssues: tracker.class.Issue,
      labels: tags.class.TagReference
    }
  }

  let kanbanUI: Kanban
  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    kanbanUI?.select(offset, of, dir)
  })
  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })

  const showMenu = async (ev: MouseEvent, items: Doc[]): Promise<void> => {
    ev.preventDefault()
    showPopup(Menu, { object: items, baseMenuClass }, getEventPositionElement(ev))
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

  $: listProvider.update(issues)

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
    categories = await getCategories(client, _class, space, docs, groupByKey, viewlet.descriptor)
    for (const viewOption of viewOptionsModel ?? []) {
      if (viewOption.actionTarget !== 'category') continue
      const categoryFunc = viewOption as CategoryOption
      if (viewOptions[viewOption.key] ?? viewOption.defaultValue) {
        const categoryAction = await getResource(categoryFunc.action)

        const spaces = getCategorySpaces(categories)
        if (space !== undefined) {
          spaces.push(space)
        }
        const res = await categoryAction(
          _class,
          spaces.length > 0 ? { space: { $in: Array.from(spaces.values()) } } : {},
          space,
          groupByKey,
          update,
          queryId,
          viewlet.descriptor
        )
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
    if ((doc as any)[groupByKey] === groupValue && viewOptions.orderBy[0] !== 'rank') {
      return
    }
    return {
      [groupByKey]: groupValue,
      space: doc.space
    }
  }

  function shouldShowFooter (
    config: (string | BuildModelKey)[],
    reports: number,
    estimations: number,
    issue: WithLookup<Issue>
  ): boolean {
    if (enabledConfig(config, 'estimation') && (reports > 0 || estimations > 0)) return true
    if (enabledConfig(config, 'comments')) {
      if ((issue.comments ?? 0) > 0) return true
      if ((issue.$lookup?.attachedTo?.comments ?? 0) > 0) return true
    }
    if (enabledConfig(config, 'attachments') && (issue.attachments ?? 0) > 0) return true
    return false
  }
</script>

{#if categories.length === 0}
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
    <svelte:fragment slot="header" let:state let:count let:index>
      {@const color = accentColors.get(`${index}${$themeStore.dark}${groupByKey}`)}
      {@const headerBGColor = color?.background ?? defaultBackground($themeStore.dark)}
      <div style:background={headerBGColor} class="header flex-between">
        <div class="flex-row-center gap-1">
          <span
            class="clear-mins fs-bold overflow-label pointer-events-none"
            style:color={color?.title ?? 'var(--theme-caption-color)'}
          >
            {#if groupByKey === noCategory}
              <Label label={view.string.NoGrouping} />
            {:else if headerComponent}
              <svelte:component
                this={headerComponent.presenter}
                value={state}
                {space}
                size={'small'}
                kind={'list-header'}
                display={'kanban'}
                colorInherit={!$themeStore.dark}
                accent
                on:accent-color={(ev) => setAccentColor(index, ev)}
              />
            {/if}
          </span>
          <span class="counter">
            {count}
          </span>
        </div>
        <div class="tools gap-1">
          <Button
            icon={IconAdd}
            kind={'ghost'}
            showTooltip={{ label: tracker.string.AddIssueTooltip, direction: 'left' }}
            on:click={() => {
              showPopup(CreateIssue, { space: currentSpace, [groupByKey]: state._id }, 'top')
            }}
          />
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object>
      {@const issue = toIssue(object)}
      {@const issueId = object._id}
      {@const reports =
        issue.reportedTime + (issue.childInfo ?? []).map((it) => it.reportedTime).reduce((a, b) => a + b, 0)}
      {@const estimations = (issue.childInfo ?? []).map((it) => it.estimation).reduce((a, b) => a + b, 0)}
      {#key issueId}
        <div
          class="tracker-card"
          on:click={() => {
            openDoc(hierarchy, issue)
          }}
        >
          <div class="card-header flex-between">
            <div class="flex-row-center text-sm">
              <!-- {#if groupByKey !== 'status'} -->
              <div class="mr-1">
                <StatusEditor value={issue} kind="list" isEditable={false} />
              </div>
              <!-- {/if} -->
              <IssuePresenter value={issue} />
              <ParentNamesPresenter value={issue} />
            </div>
            <div class="flex-row-center gap-2 reverse flex-no-shrink">
              <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
              <AssigneeEditor object={issue} avatarSize={'card'} shouldShowName={false} />
            </div>
          </div>
          <div class="card-content text-md caption-color lines-limit-2">
            {object.title}
          </div>
          <div class="card-labels">
            {#if enabledConfig(config, 'subIssues') && issue && issue.subIssues > 0}
              <SubIssuesSelector value={issue} {currentProject} size={'small'} />
            {/if}
            {#if enabledConfig(config, 'priority')}
              <PriorityEditor
                value={issue}
                isEditable={true}
                kind={'link-bordered'}
                size={'small'}
                justify={'center'}
              />
            {/if}
            {#if enabledConfig(config, 'component')}
              <ComponentEditor
                value={issue}
                {space}
                isEditable={true}
                kind={'link-bordered'}
                size={'small'}
                justify={'center'}
                shrink={1}
                bind:onlyIcon={fullFilled[issueId]}
              />
            {/if}
            {#if enabledConfig(config, 'dueDate')}
              <DueDatePresenter value={issue} size={'small'} kind={'link-bordered'} />
            {/if}
          </div>
          {#if enabledConfig(config, 'labels')}
            <div class="card-labels labels">
              <Component
                is={tags.component.LabelsPresenter}
                props={{
                  value: issue.labels,
                  object: issue,
                  ckeckFilled: fullFilled[issueId],
                  kind: 'link',
                  compression: true
                }}
                on:change={(res) => {
                  if (res.detail.full) fullFilled[issueId] = true
                }}
              />
            </div>
          {/if}
          {#if shouldShowFooter(config, reports, estimations, object)}
            <div class="card-footer flex-between">
              {#if enabledConfig(config, 'estimation')}
                <EstimationEditor kind={'list'} size={'small'} value={issue} />
              {/if}
              <div class="flex-row-center gap-3 reverse">
                {#if enabledConfig(config, 'attachments') && (object.attachments ?? 0) > 0}
                  <AttachmentsPresenter value={object.attachments} {object} />
                {/if}
                {#if enabledConfig(config, 'comments')}
                  {#if (object.comments ?? 0) > 0}
                    <CommentsPresenter value={object.comments} {object} />
                  {/if}
                  {#if object.$lookup?.attachedTo !== undefined && (object.$lookup.attachedTo.comments ?? 0) > 0}
                    <CommentsPresenter
                      value={object.$lookup?.attachedTo?.comments}
                      object={object.$lookup?.attachedTo}
                      withInput={false}
                    />
                  {/if}
                {/if}
              </div>
            </div>
          {:else}
            <div class="min-h-4 max-h-4 h-4" />
          {/if}
        </div>
      {/key}
    </svelte:fragment>
  </Kanban>
{/if}

<style lang="scss">
  .header {
    margin: 0 0.75rem 0.5rem;
    padding: 0 0.5rem 0 1.25rem;
    height: 2.5rem;
    min-height: 2.5rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;

    .counter {
      color: var(--theme-dark-color);
    }
    .tools {
      opacity: 0;
    }
    &:hover .tools {
      opacity: 1;
    }
  }
  .tracker-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 6.5rem;
    border-radius: 0.25rem;

    .card-header {
      padding: 0.75rem 1rem 0;
    }
    .card-content {
      margin: 0.5rem 1rem;
    }
    /* Global styles in components.scss */
    .card-labels {
      display: flex;
      flex-wrap: nowrap;
      margin: 0 0.75rem 0 1rem;
      min-width: 0;

      &.labels {
        overflow: hidden;
        flex-shrink: 1;
        margin: 0 1rem;
        width: calc(100% - 2rem);
        border-radius: 0 0.24rem 0.24rem 0;
      }
    }
    .card-footer {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background-color: var(--theme-kanban-card-footer);
      border-radius: 0 0 0.25rem 0.25rem;
    }
  }
</style>
