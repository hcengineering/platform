<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import core, {
    CategoryType,
    Class,
    Doc,
    DocumentQuery,
    DocumentUpdate,
    FindOptions,
    generateId,
    Lookup,
    mergeQueries,
    Ref
  } from '@hcengineering/core'
  import { DocWithRank, Item, Kanban as KanbanUI } from '@hcengineering/kanban'
  import { getResource } from '@hcengineering/platform'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { Project, Task, TaskOrdering } from '@hcengineering/task'
  import { ColorDefinition, defaultBackground, Label, themeStore } from '@hcengineering/ui'
  import view, { AttributeModel, BuildModelKey, Viewlet, ViewOptionModel, ViewOptions } from '@hcengineering/view'
  import {
    focusStore,
    getCategoryQueryNoLookup,
    getCategoryQueryNoLookupOptions,
    getCategoryQueryProjection,
    getGroupByValues,
    getPresenter,
    groupBy,
    ListSelectionProvider,
    noCategory,
    SelectDirection,
    setGroupByValues,
    showMenu
  } from '@hcengineering/view-resources'
  import { onMount } from 'svelte'
  import task from '../../plugin'
  import { getTaskKanbanResultQuery, updateTaskKanbanCategories } from '../../utils'
  import KanbanDragDone from './KanbanDragDone.svelte'

  export let _class: Ref<Class<Task>>
  export let space: Ref<Project> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let query: DocumentQuery<Task> = {}
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let viewOptions: ViewOptions
  export let viewlet: Viewlet
  export let config: (string | BuildModelKey)[]
  export let options: FindOptions<DocWithRank> | undefined = undefined

  $: groupByKey = viewOptions.groupBy[0] ?? noCategory
  $: orderBy = viewOptions.orderBy

  let accentColors = new Map<string, ColorDefinition>()
  const setAccentColor = (n: number, ev: CustomEvent<ColorDefinition>): void => {
    accentColors.set(`${n}${$themeStore.dark}${groupByKey}`, ev.detail)
    accentColors = accentColors
  }

  $: dontUpdateRank = orderBy[0] !== TaskOrdering.Manual

  let resultQuery: DocumentQuery<any> = { ...query }
  const client = getClient()

  $: void getTaskKanbanResultQuery(client.getHierarchy(), query, viewOptionsConfig, viewOptions).then((p) => {
    resultQuery = mergeQueries(p, query)
  })

  $: queryNoLookup = getCategoryQueryNoLookup(
    mergeQueries(resultQuery, activeSpaces.length > 0 ? { space: { $in: activeSpaces } } : {})
  )
  const lookup: Lookup<Task> = {
    ...(options?.lookup ?? {}),
    space: task.class.Project,
    status: core.class.Status,
    _id: {
      labels: tags.class.TagReference
    }
  }
  $: resultOptions = { ...options, lookup, ...(orderBy !== undefined ? { sort: { [orderBy[0]]: orderBy[1] } } : {}) }

  let kanbanUI: KanbanUI
  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    kanbanUI?.select(offset, of, dir)
  })
  const selection = listProvider.selection

  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })

  const showContextMenu = async (ev: MouseEvent, items: Doc[]): Promise<void> => {
    showMenu(ev, { object: items, baseMenuClass })
  }
  // Category information only
  let tasks: DocWithRank[] = []

  $: groupByDocs = groupBy(tasks, groupByKey, categories)

  let fastDocs: DocWithRank[] = []
  let slowDocs: DocWithRank[] = []
  let activeSpaces: Ref<Project>[] = []
  const docsQuery = createQuery()
  const docsQuerySlow = createQuery()
  const activeSpaceQuery = createQuery()

  let fastQueryIds = new Set<Ref<DocWithRank>>()

  let categoryQueryOptions: Partial<FindOptions<DocWithRank>>
  $: categoryQueryOptions = {
    ...getCategoryQueryNoLookupOptions(resultOptions),
    projection: {
      ...resultOptions.projection,
      _id: 1,
      _class: 1,
      rank: 1,
      ...getCategoryQueryProjection(client.getHierarchy(), _class, queryNoLookup, viewOptions.groupBy)
    }
  }
  $: activeSpaceQuery.query(
    task.class.Project,
    {
      archived: false
    },
    (res) => {
      activeSpaces = res.map((r: Project) => r._id)
    },
    { projection: { _id: 1 } }
  )
  $: docsQuery.query(
    _class,
    queryNoLookup,
    (res) => {
      fastDocs = res
      fastQueryIds = new Set(res.map((it) => it._id))
    },
    { ...categoryQueryOptions, limit: 1000 }
  )
  $: docsQuerySlow.query(
    _class,
    queryNoLookup,
    (res) => {
      slowDocs = res
    },
    categoryQueryOptions
  )

  $: tasks = [...fastDocs, ...slowDocs.filter((it) => !fastQueryIds.has(it._id))]

  $: listProvider.update(tasks)

  let categories: CategoryType[] = []

  const queryId = generateId()

  function update (): void {
    void updateTaskKanbanCategories(
      client,
      viewlet,
      _class,
      space,
      tasks,
      groupByKey,
      viewOptions,
      viewOptionsConfig,
      update,
      queryId
    ).then((res) => {
      categories = res
    })
  }

  $: void updateTaskKanbanCategories(
    client,
    viewlet,
    _class,
    space,
    tasks,
    groupByKey,
    viewOptions,
    viewOptionsConfig,
    update,
    queryId
  ).then((res) => {
    categories = res
  })

  function getHeader (_class: Ref<Class<Doc>>, groupByKey: string): void {
    if (groupByKey === noCategory) {
      headerComponent = undefined
    } else {
      void getPresenter(client, _class, { key: groupByKey }, { key: groupByKey }).then((p) => {
        headerComponent = p
      })
    }
  }

  let headerComponent: AttributeModel | undefined
  $: getHeader(_class, groupByKey)

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

  $: clazz = client.getHierarchy().getClass(_class)
  $: presenterMixin = client.getHierarchy().as(clazz, task.mixin.KanbanCard)
  $: cardPresenter = getResource(presenterMixin.card)

  const getDoneUpdate = (e: any) => ({ status: e.detail._id }) as unknown as DocumentUpdate<Doc>
</script>

{#await cardPresenter then presenter}
  <ActionContext
    context={{
      mode: 'browser'
    }}
  />
  <KanbanUI
    bind:this={kanbanUI}
    {categories}
    {dontUpdateRank}
    {_class}
    query={resultQuery}
    options={resultOptions}
    objects={tasks}
    getGroupByValues={(groupByDocs, category) =>
      groupByKey === noCategory ? tasks : getGroupByValues(groupByDocs, category)}
    {setGroupByValues}
    {getUpdateProps}
    {groupByDocs}
    {groupByKey}
    on:obj-focus={(evt) => {
      listProvider.updateFocus(evt.detail)
    }}
    selection={listProvider.current($focusStore)}
    checked={$selection ?? []}
    on:check={(evt) => {
      listProvider.updateSelection(evt.detail.docs, evt.detail.value)
    }}
    on:contextmenu={(evt) => showContextMenu(evt.detail.evt, evt.detail.objects)}
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
                on:accent-color={(ev) => {
                  setAccentColor(index, ev)
                }}
              />
            {/if}
          </span>
          <span class="counter ml-1">
            {count}
          </span>
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="card" let:object let:dragged>
      <svelte:component this={presenter} {object} {dragged} {groupByKey} {config} />
    </svelte:fragment>
    <!-- eslint-disable-next-line no-undef -->
    <svelte:fragment slot="doneBar" let:onDone>
      {#if space}
        <KanbanDragDone
          {space}
          on:done={(e) => {
            // eslint-disable-next-line no-undef
            onDone(getDoneUpdate(e))
          }}
        />
      {/if}
    </svelte:fragment>
  </KanbanUI>
{/await}

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
  }
</style>
