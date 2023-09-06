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
  import { Attribute, Class, Data, Ref, SortingOrder, Status } from '@hcengineering/core'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { DoneStateTemplate, KanbanTemplate, KanbanTemplateSpace, StateTemplate, calcRank } from '@hcengineering/task'
  import { EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  export let status: StateTemplate | undefined = undefined
  export let _class: Ref<Class<StateTemplate | DoneStateTemplate>> | undefined = status?._class
  export let template: KanbanTemplate
  export let ofAttribute: Ref<Attribute<Status>>
  export let space: KanbanTemplateSpace
  export let value = status?.name ?? ''

  let canSave = true
  async function save () {
    if (space === undefined && template === undefined && status?.space === undefined) return
    const attachedTo = { attachedTo: template._id }
    if (_class !== undefined && status === undefined) {
      const lastOne = await client.findOne(_class, attachedTo, { sort: { rank: SortingOrder.Descending } })
      let newDoc: Data<StateTemplate> = {
        ofAttribute,
        name: value.trim(),
        rank: calcRank(lastOne, undefined),
        ...attachedTo
      }
      if (!hierarchy.isDerived(_class, task.class.DoneState)) {
        newDoc = {
          ofAttribute,
          name: value.trim(),
          color: 9,
          rank: calcRank(lastOne, undefined),
          ...attachedTo
        }
      }
      const ops = client.apply(template.space).notMatch(_class, {
        space: template.space,
        name: value.trim(),
        ...attachedTo
      })
      await ops.createDoc(_class, template.space, newDoc)
      canSave = await ops.commit()
    }
    if (status !== undefined && _class !== undefined) {
      const ops = client.apply(status._id).notMatch(_class, { space: status.space, name: value.trim(), ...attachedTo })
      await ops.update(status, { name: value.trim() })
      canSave = await ops.commit()
    }
    if (canSave) dispatch('close')
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
