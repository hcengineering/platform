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
  import { Card } from '@hcengineering/board'
  import {
    CategoryType,
    Class,
    Doc,
    DocumentQuery,
    DocumentUpdate,
    FindOptions,
    Ref,
    Status,
    WithLookup
  } from '@hcengineering/core'
  import { Kanban as KanbanUI } from '@hcengineering/kanban'
  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import type { DocWithRank, Project } from '@hcengineering/task'
  import task, { getStates } from '@hcengineering/task'
  import { typeStore } from '@hcengineering/task-resources'
  import {
    ListSelectionProvider,
    SelectDirection,
    focusStore,
    getCategoryQueryNoLookup,
    getGroupByValues,
    groupBy,
    setGroupByValues,
    showMenu,
    statusStore
  } from '@hcengineering/view-resources'
  import { onMount } from 'svelte'
  import KanbanCard from './KanbanCard.svelte'
  import ListHeader from './ListHeader.svelte'
  import AddCard from './add-card/AddCard.svelte'

  export let _class: Ref<Class<Card>>
  export let space: Ref<Project>
  export let query: DocumentQuery<Card>
  export let options: FindOptions<Card> | undefined

  let _space: Project
  let states: Status[] = []

  const spaceQuery = createQuery()
  $: spaceQuery.query(task.class.Project, { _id: space }, (result) => {
    _space = result[0]
  })

  $: states = getStates(_space, $typeStore, $statusStore.byId)

  function castObject (object: any): WithLookup<Card> {
    return object as WithLookup<Card>
  }

  let kanbanUI: KanbanUI
  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    kanbanUI?.select(offset, of, dir)
  })
  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })

  const selection = listProvider.selection

  let resultQuery: DocumentQuery<Card>

  $: resultQuery = { ...query, isArchived: { $nin: [true] }, space }

  const cardQuery = createQuery()
  let cards: Card[] = []

  $: cardQuery.query<Card>(
    _class,
    getCategoryQueryNoLookup(resultQuery),
    (result) => {
      cards = result
    },
    {
      ...options
    }
  )
  $: listProvider.update(cards)
  $: groupByDocs = groupBy(cards, 'status')

  const getUpdateProps = (doc: Doc, category: CategoryType): DocumentUpdate<DocWithRank> | undefined => {
    const groupValue =
      typeof category === 'object' ? category.values.find((it) => it.space === doc.space)?._id : category
    if (groupValue === undefined) {
      return undefined
    }
    return {
      status: groupValue,
      space: doc.space
    } as any
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
{states.length}
<KanbanUI
  bind:this={kanbanUI}
  objects={cards}
  getGroupByValues={(groupByDocs, category) => getGroupByValues(groupByDocs, category)}
  {setGroupByValues}
  categories={states.map((it) => it._id)}
  on:obj-focus={(evt) => {
    listProvider.updateFocus(evt.detail.object)
  }}
  {groupByDocs}
  {getUpdateProps}
  {_class}
  query={resultQuery}
  {options}
  groupByKey={'status'}
  checked={$selection ?? []}
  on:check={(evt) => {
    listProvider.updateSelection(evt.detail.docs, evt.detail.value)
  }}
  on:contextmenu={(evt) => {
    showMenu(evt.detail.evt, { object: evt.detail.objects })
  }}
  selection={listProvider.current($focusStore)}
>
  <svelte:fragment slot="card" let:object>
    <KanbanCard object={castObject(object)} />
  </svelte:fragment>

  <svelte:fragment slot="header" let:state>
    {@const st = states.find((it) => it._id === state)}
    {#if st}
      <ListHeader state={st} />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="afterCard" let:state={targetState}>
    {@const st = states.find((it) => it._id === targetState)}
    {#if st}
      <AddCard {space} state={st} />
    {/if}
  </svelte:fragment>
</KanbanUI>
