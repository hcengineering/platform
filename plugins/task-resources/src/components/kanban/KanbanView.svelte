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
  import {
    CategoryType,
    Class,
    Doc,
    DocumentQuery,
    DocumentUpdate,
    FindOptions,
    generateId,
    Ref
  } from '@hcengineering/core'
  import { Item, Kanban as KanbanUI } from '@hcengineering/kanban'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient, ActionContext } from '@hcengineering/presentation'
  import { SpaceWithStates, Task, TaskGrouping, TaskOrdering } from '@hcengineering/task'
  import {
    ColorDefinition,
    defaultBackground,
    getEventPositionElement,
    Label,
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
    focusStore,
    getCategories,
    getCategorySpaces,
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
  import task from '../../plugin'
  import KanbanDragDone from './KanbanDragDone.svelte'

  export let _class: Ref<Class<Task>>
  export let space: Ref<SpaceWithStates> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let query: DocumentQuery<Task> = {}
  export let viewOptionsConfig: ViewOptionModel[] | undefined
  export let viewOptions: ViewOptions
  export let viewlet: Viewlet
  export let config: (string | BuildModelKey)[]

  export let options: FindOptions<Task> | undefined

  $: groupByKey = (viewOptions.groupBy[0] ?? noCategory) as TaskGrouping
  $: orderBy = viewOptions.orderBy
  $: sort = { [orderBy[0]]: orderBy[1] }

  $: dontUpdateRank = orderBy[0] !== TaskOrdering.Manual

  let accentColors: Map<string, ColorDefinition> = new Map()
  const setAccentColor = (n: number, ev: CustomEvent<ColorDefinition>) => {
    accentColors.set(`${n}${$themeStore.dark}${groupByKey}`, ev.detail)
    accentColors = accentColors
  }

  let resultQuery: DocumentQuery<any> = { ...query }
  $: getResultQuery(query, viewOptionsConfig, viewOptions).then((p) => (resultQuery = { ...p, ...query }))

  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function getResultQuery (
    query: DocumentQuery<Task>,
    viewOptions: ViewOptionModel[] | undefined,
    viewOptionsStore: ViewOptions
  ): Promise<DocumentQuery<Task>> {
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

  let kanbanUI: KanbanUI
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
  let tasks: Task[] = []

  $: groupByDocs = groupBy(tasks, groupByKey, categories)

  $: issuesQuery.query<Task>(
    _class,
    resultQuery,
    (result) => {
      tasks = result
    },
    {
      ...options,
      lookup: {
        ...options?.lookup,
        space: task.class.SpaceWithStates,
        status: task.class.State,
        doneState: task.class.DoneState
      },
      sort: {
        ...options?.sort,
        ...sort
      }
    }
  )
  $: listProvider.update(tasks)

  let categories: CategoryType[] = []

  const queryId = generateId()

  $: updateCategories(_class, space, tasks, groupByKey, viewOptions, viewOptionsConfig)

  function update () {
    updateCategories(_class, space, tasks, groupByKey, viewOptions, viewOptionsConfig)
  }

  async function updateCategories (
    _class: Ref<Class<Doc>>,
    space: Ref<SpaceWithStates> | undefined,
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

  function getHeader (_class: Ref<Class<Doc>>, groupByKey: string): void {
    if (groupByKey === noCategory) {
      headerComponent = undefined
    } else {
      getPresenter(client, _class, { key: groupByKey }, { key: groupByKey }).then((p) => (headerComponent = p))
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
    if ((doc as any)[groupByKey] === groupValue && viewOptions.orderBy[0] !== 'rank') {
      return
    }
    return {
      [groupByKey]: groupValue,
      space: doc.space
    }
  }

  $: clazz = client.getHierarchy().getClass(_class)
  $: presenterMixin = client.getHierarchy().as(clazz, task.mixin.KanbanCard)
  $: cardPresenter = getResource(presenterMixin.card)

  const getDoneUpdate = (e: any) => ({ doneState: e.detail._id } as DocumentUpdate<Doc>)
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
    objects={tasks}
    getGroupByValues={(groupByDocs, category) =>
      groupByKey === noCategory ? tasks : getGroupByValues(groupByDocs, category)}
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

      <div style:background={headerBGColor} class="header flex-row-center">
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
              colorInherit={!$themeStore.dark}
              accent
              on:accent-color={(ev) => setAccentColor(index, ev)}
            />
          {/if}
        </span>
        <span class="counter ml-1">
          {count}
        </span>
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
