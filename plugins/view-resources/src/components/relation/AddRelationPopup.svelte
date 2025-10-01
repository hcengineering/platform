<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import core, { Association, Class, Data, Doc, Ref, Relation, SortingOrder } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { Dropdown, ListItem } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import ObjectBox from '../ObjectBox.svelte'

  export let value: Doc | Doc[]

  const client = getClient()
  const h = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function getCommonClass (value: Doc | Doc[]): Ref<Class<Doc>> | undefined {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return undefined
      }
      let possibleValues: Ref<Class<Doc>>[] | undefined = [value[0]._class]
      for (const val of value) {
        const ancestors = h.getAncestors(val._class)
        possibleValues = possibleValues.filter((possible) => ancestors.includes(possible))
      }
      return possibleValues.length > 0 ? possibleValues[0] : undefined
    } else {
      return value?._class
    }
  }

  interface Item extends ListItem {
    _class: Ref<Class<Doc>>
    association: Ref<Association>
    direction: 'A' | 'B'
  }

  $: items = getItems(value)

  function getItems (value: Doc | Doc[]): Item[] {
    const _class = getCommonClass(value)
    if (_class === undefined) return []
    const descendants = h.getDescendants(_class)
    const leftAssociations = client.getModel().findAllSync(core.class.Association, { classA: { $in: descendants } })
    const rightAssociations = client.getModel().findAllSync(core.class.Association, { classB: { $in: descendants } })
    const items: Item[] = []
    rightAssociations.forEach((a) => {
      items.push({
        _id: 'A_' + a._id,
        label: a.nameA,
        _class: a.classA,
        association: a._id,
        direction: 'A'
      })
    })
    leftAssociations.forEach((a) => {
      items.push({
        _id: 'B_' + a._id,
        label: a.nameB,
        _class: a.classB,
        association: a._id,
        direction: 'B'
      })
    })
    return items
  }

  let selected: Item | undefined = undefined

  async function save (): Promise<void> {
    if (selected === undefined || target === undefined) return
    const objects = Array.isArray(value) ? value : [value]
    for (const obj of objects) {
      const data: Data<Relation> = {
        docA: selected.direction === 'B' ? obj._id : target,
        docB: selected.direction === 'B' ? target : obj._id,
        association: selected.association
      }
      const op = client.apply(obj._id).notMatch(core.class.Relation, data)
      op.createDoc(core.class.Relation, core.space.Workspace, data)
      await op.commit()
    }
    dispatch('close')
  }

  let target: Ref<Doc> | undefined = undefined
</script>

<Card
  label={core.string.AddRelation}
  okAction={save}
  width={'x-small'}
  canSave={target !== undefined}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="mb-2">
    <Dropdown {items} placeholder={core.string.Relation} bind:selected on:selected={() => (target = undefined)} />
  </div>
  {#if selected !== undefined}
    <ObjectBox
      _class={selected._class}
      options={{ sort: { modifiedOn: SortingOrder.Descending } }}
      bind:value={target}
      label={core.string.Relation}
      kind={'ghost'}
      size="small"
      allowDeselect={false}
      showNavigate={false}
      docProps={{ disableLink: true, showTitle: true }}
    />
  {/if}
</Card>
