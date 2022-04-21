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
  import { Card } from '@anticrm/board'
  import { Class, Doc, FindOptions, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { Kanban as KanbanUI } from '@anticrm/kanban'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { Kanban, SpaceWithStates, State } from '@anticrm/task'
  import task, { calcRank } from '@anticrm/task'
  import { showPopup } from '@anticrm/ui'
  import { ActionContext, focusStore, ListSelectionProvider, Menu, selectionStore } from '@anticrm/view-resources'
  import { onMount } from 'svelte'
  import AddCard from './add-card/AddCard.svelte'
  import KanbanCard from './KanbanCard.svelte'
  import KanbanPanelEmpty from './KanbanPanelEmpty.svelte'

  export let _class: Ref<Class<Card>>
  export let space: Ref<SpaceWithStates>
  export let search: string
  export let options: FindOptions<Card> | undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined

  let kanban: Kanban
  let states: State[] = []

  const kanbanQuery = createQuery()
  $: kanbanQuery.query(task.class.Kanban, { attachedTo: space }, (result) => {
    kanban = result[0]
  })

  const statesQuery = createQuery()
  $: if (kanban !== undefined) {
    statesQuery.query(
      task.class.State,
      { space: kanban.space },
      (result) => {
        states = result
      },
      {
        sort: {
          rank: SortingOrder.Ascending
        }
      }
    )
  }
  function castObject (object: any): WithLookup<Card> {
    return object as WithLookup<Card>
  }

  const client = getClient()

  async function addItem (title: any) {
    const lastOne = await client.findOne(task.class.State, { space }, { sort: { rank: SortingOrder.Descending } })
    await client.createDoc(task.class.State, space, {
      title,
      color: 9,
      rank: calcRank(lastOne, undefined)
    })
  }
  /* eslint-disable no-undef */

  let kanbanUI: KanbanUI
  const listProvider = new ListSelectionProvider(
    (pos, dir) => {
      if (dir === 'vertical') {
        // Select next
        kanbanUI.selectStatePosition(pos, 'down')
      } else {
        kanbanUI.selectStatePosition(pos, 'right')
      }
    },
    (pos, dir) => {
      // Select prev
      if (dir === 'vertical') {
        kanbanUI.selectStatePosition(pos, 'up')
      } else {
        kanbanUI.selectStatePosition(pos, 'left')
      }
    }
  )
  onMount(() => {
    (document.activeElement as HTMLElement)?.blur()
  })

  const showMenu = async (ev: MouseEvent, items: Doc[]): Promise<void> => {
    ev.preventDefault()
    showPopup(Menu, { object: items, baseMenuClass }, {
      getBoundingClientRect: () => DOMRect.fromRect({ width: 1, height: 1, x: ev.clientX, y: ev.clientY })
    }, () => {
      // selection = undefined
    })
  }
</script>

<ActionContext
    context={{
      mode: 'browser'
    }}
  />
<KanbanUI
  bind:this={kanbanUI}
  {_class}
  {space}
  {search}
  {options}
  query={{ doneState: null, isArchived: {$nin: [true]} }}
  {states}
  fieldName={'state'}
  rankFieldName={'rank'}
  on:content={(evt) => {
    listProvider.update(evt.detail)
  }}
  on:obj-focus={(evt) => {
    listProvider.updateFocus(evt.detail)
  }}
  checked={$selectionStore ?? []}
  on:check={(evt) => {
    listProvider.updateSelection(evt.detail.docs, evt.detail.value)
  }}
  on:contextmenu={(evt) => showMenu(evt.detail.evt, evt.detail.objects)}
  selection={listProvider.current($focusStore)}
>
  <svelte:fragment slot="card" let:object let:dragged>
    <KanbanCard object={castObject(object)} {dragged} />
  </svelte:fragment>

  <svelte:fragment slot="additionalPanel">
    <KanbanPanelEmpty
      on:add={(e) => {
        addItem(e.detail)
      }}
    />
  </svelte:fragment>

  <svelte:fragment slot="afterCard" let:space={targetSpace} let:state={targetState}>
    <AddCard space={targetSpace} state={targetState} />
  </svelte:fragment>
</KanbanUI>
