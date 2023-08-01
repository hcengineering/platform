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
  import { EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { calcRank, DoneState, Kanban, KanbanTemplate, KanbanTemplateSpace, State } from '@hcengineering/task'
  import { Class, Data, Ref, SortingOrder } from '@hcengineering/core'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  export let status: State | undefined = undefined
  export let _class: Ref<Class<State | DoneState>> | undefined = status?._class
  export let template: KanbanTemplate | undefined = undefined
  export let value = status?.name ?? ''
  const isTemplate = template !== undefined
  export let space: Kanban | KanbanTemplateSpace | undefined

  let canSave = true
  async function save () {
    if (space === undefined && template === undefined && status?.space === undefined) return
    const attachedTo = isTemplate && template?._id ? { attachedTo: template._id } : {}
    const kanban = space as Kanban
    if (_class !== undefined && status === undefined) {
      const query = isTemplate ? { ...attachedTo } : kanban?.attachedTo ? { space: kanban.attachedTo } : {}
      const lastOne = await client.findOne(_class, query, { sort: { rank: SortingOrder.Descending } })
      let newDoc: Data<State> = {
        ofAttribute: task.attribute.State,
        name: value.trim(),
        rank: calcRank(lastOne, undefined),
        ...attachedTo
      }
      if (!hierarchy.isDerived(_class, task.class.DoneState)) {
        newDoc = {
          ofAttribute: task.attribute.State,
          name: value.trim(),
          color: 9,
          rank: calcRank(lastOne, undefined),
          ...attachedTo
        }
      }
      const ops = client.apply('create-update-state').notMatch(_class, {
        space: isTemplate && template ? template.space : kanban?.attachedTo,
        name: value.trim(),
        ...attachedTo
      })
      await ops.createDoc(_class, isTemplate && template ? template.space : kanban?.attachedTo, newDoc)
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
