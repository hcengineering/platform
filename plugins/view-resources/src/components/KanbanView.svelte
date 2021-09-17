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
  import { createEventDispatcher } from 'svelte'
  import type { Ref, Class, Doc, Space, FindOptions, State } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { buildModel } from '../utils'
  import { getClient } from '@anticrm/presentation'
  import { Label, showPopup, Loading, ScrollBox, AnyComponent } from '@anticrm/ui'
  import type { AnySvelteComponent } from '@anticrm/ui'

  import { createQuery } from '@anticrm/presentation'

  import KanbanPanel from './KanbanPanel.svelte'
  import KanbanPanelEmpty from './KanbanPanelEmpty.svelte'
  import KanbanCardEmpty from './KanbanCardEmpty.svelte'

  import core from '@anticrm/core'
  import view from '@anticrm/view'

  export let _class: Ref<Class<(Doc & { state: Ref<State> })>>
  export let space: Ref<Space>
  export let open: AnyComponent
  export let options: FindOptions<Doc> | undefined
  export let config: string[]

  let states: State[] = []
  let objects: (Doc & { state: Ref<State> })[] = []

  const statesQuery = createQuery()
  $: statesQuery.query(core.class.State, { space }, result => { states = result })

  const query = createQuery()
  $: query.query(_class, { space }, result => { objects = result }, options)

  function getValue(doc: Doc, key: string): any {
    if (key.length === 0)
      return doc
    const path = key.split('.')
    const len = path.length
    let obj = doc as any
    for (let i=0; i<len; i++){
      obj = obj?.[path[i]]
    }
    return obj
  }

  const client = getClient()

  function onClick(object: Doc) {
    showPopup(open, { object, space }, 'float')
  }

  let dragCard: (Doc & { state: Ref<State>}) | undefined

  async function cardPresenter(_class: Ref<Class<Doc>>): Promise<AnySvelteComponent> {
    const clazz = client.getHierarchy().getClass(_class) 
    const presenterMixin = client.getHierarchy().as(clazz, view.mixin.KanbanCard)
    return await getResource(presenterMixin.card)
  }

</script>

{#await cardPresenter(_class)}
 <Loading/>
{:then presenter}
<div class="kanban-container">
  <ScrollBox>
    <div class="kanban-content">
      {#each states as state, i}
        <KanbanPanel label={state.title} color={state.color} counter={4}
          on:dragover={(event) => {
            event.preventDefault()
          }}
          on:drop={(event) => {
            event.preventDefault()
            if (dragCard) {
              client.updateDoc(_class, space, dragCard._id, { state: state._id })
              dragCard = undefined
            }
          }}
        >
          <KanbanCardEmpty label={'Create new application'} />
          {#each objects.filter((c) => c.state === state._id) as object}
            <svelte:component this={presenter} {object} draggable={true}
            on:dragstart={() => {
              dragCard = object
            }}
            on:dragend={() => {
              dragCard = undefined
            }}/>
          {/each}
        </KanbanPanel>
      {/each}
      <KanbanPanelEmpty label={'Add new column'} />
    </div>
  </ScrollBox>
</div>
{/await}

<style lang="scss">
  .kanban-container {
    margin-bottom: 1.25rem;
    height: 100%;
  }
  .kanban-content {
    display: flex;
    margin: 0 2.5rem;
    height: 100%;
  }
</style>
