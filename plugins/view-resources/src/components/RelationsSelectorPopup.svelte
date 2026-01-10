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
  import core, { Association, Doc, Ref, Relation } from '@hcengineering/core'
  import { createQuery, getClient, ObjectPopup } from '@hcengineering/presentation'
  import ObjectPresenter from './ObjectPresenter.svelte'

  export let association: string
  export let target: Doc

  const parts = association.split('_')
  const associationId = parts[0] as Ref<Association>
  const direction = parts[1]

  let relations: Relation[] = []

  const client = getClient()

  const assoc = client.getModel().getObject(associationId)

  const multiSelect = assoc.type === 'N:N' || (assoc.type === '1:N' && direction === 'b')

  const targetClass = direction === 'a' ? assoc.classA : assoc.classB

  $: selectedObjects = relations.map((p) => (direction === 'a' ? p.docA : p.docB))

  const query = createQuery()
  query.query(
    core.class.Relation,
    {
      association: associationId,
      [direction === 'a' ? 'docB' : 'docA']: target._id
    },
    (res) => {
      relations = res
    }
  )

  async function handler (e: CustomEvent<any>): Promise<void> {
    if (e.detail != null) {
      const currentSet = new Set(selectedObjects)
      const newSet = new Set(Array.isArray(e.detail) ? e.detail : [e.detail])
      for (const _id of newSet) {
        if (!currentSet.has(_id)) {
          await client.createDoc(core.class.Relation, core.space.Workspace, {
            association: associationId,
            docA: direction === 'a' ? _id : target._id,
            docB: direction === 'b' ? _id : target._id
          })
        }
      }
      for (const _id of currentSet) {
        if (!newSet.has(_id)) {
          const relation = relations.find((p) => p[direction === 'b' ? 'docB' : 'docA'] === _id)
          if (relation !== undefined) {
            await client.remove(relation)
          }
        }
      }
    }
  }
</script>

<ObjectPopup _class={targetClass} {multiSelect} {selectedObjects} on:close={handler} on:update={handler}>
  <svelte:fragment slot="item" let:item>
    <ObjectPresenter value={item} props={{ type: 'text' }} />
  </svelte:fragment>
</ObjectPopup>
