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
  import card from '@hcengineering/card'
  import core, { Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { ObjectBox } from '@hcengineering/view-resources'

  export let parentTag: Ref<Doc<Space>> | undefined
  export let childTag: Ref<Doc<Space>> | undefined
  export let value: Ref<Doc<Space>>
  export let label: IntlString

  let query: DocumentQuery<Doc> = {}

  $: void getAssociations(parentTag)

  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function getAssociations (tagId: Ref<Doc<Space>> | undefined): Promise<void> {
    const descendants = parentTag !== undefined ? hierarchy.getDescendants(parentTag) : []
    const children = childTag !== undefined ? hierarchy.getDescendants(childTag) : []
    const descendantsAndChildren = descendants.concat(children)
    const leftAssociations = await client.findAll(core.class.Association, { classA: { $in: descendantsAndChildren } })
    const rightAssociations = await client.findAll(core.class.Association, { classB: { $in: descendantsAndChildren } })

    const associations = leftAssociations.concat(rightAssociations)

    const classIds = new Set<Ref<Doc>>()
    classIds.add(tagId)
    associations.forEach((association) => {
      classIds.add(association.classA)
      classIds.add(association.classB)
    })

    query = {
      _id: { $in: Array.from(classIds) }
    }
  }
</script>

<ObjectBox {label} _class={card.class.MasterTag} docQuery={query} bind:value on:change showNavigate={false} />
