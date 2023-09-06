<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Attribute, Class, Data, Ref, Status } from '@hcengineering/core'
  import presentation, { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { DoneState, SpaceWithStates, State, createState } from '@hcengineering/task'
  import { EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  export let status: State | undefined = undefined
  export let _class: Ref<Class<State | DoneState>> | undefined = status?._class
  export let ofAttribute: Ref<Attribute<Status>>
  export let value = status?.name ?? ''
  export let space: Ref<SpaceWithStates>

  let _space: SpaceWithStates | undefined = undefined
  const query = createQuery()
  $: query.query(task.class.SpaceWithStates, { _id: space }, (res) => {
    _space = res[0]
  })

  const canSave = true
  async function save () {
    if (_space === undefined || _class === undefined) return
    if (status === undefined) {
      if (!hierarchy.isDerived(_class, task.class.DoneState)) {
        const newDoc: Data<State> = {
          ofAttribute,
          name: value.trim(),
          color: 9
        }
        const id = await createState(client, _class, newDoc)
        await client.update(_space, { $push: { states: id } })
      } else {
        const newDoc: Data<DoneState> = {
          ofAttribute,
          name: value.trim()
        }
        const id = await createState(client, _class, newDoc)
        await client.update(_space, { $push: { states: id } })
      }
    } else {
      const id = await createState(client, _class, { ...status, name: value.trim() })
      if (!hierarchy.isDerived(_class, task.class.DoneState)) {
        const states = _space.states
        const index = states.findIndex((x) => x === status?._id)
        if (index !== -1) {
          states[index] = id
          await client.update(_space, { states })
        }
      } else {
        const states = _space.doneStates ?? []
        const index = states.findIndex((x) => x === status?._id)
        if (index !== -1) {
          states[index] = id
          await client.update(_space, { doneStates: states })
        }
      }
    }
    dispatch('close')
  }
</script>

<Card
  label={task.string.StatusPopupTitle}
  okAction={save}
  canSave
  okLabel={presentation.string.Save}
  on:changeContent
  onCancel={() => dispatch('close')}
>
  <EditBox focusIndex={1} bind:value placeholder={task.string.StatusName} kind={'large-style'} autoFocus fullSize />
  <svelte:fragment slot="error">
    {#if !canSave}
      <Label label={task.string.NameAlreadyExists} />
    {/if}
  </svelte:fragment>
</Card>
