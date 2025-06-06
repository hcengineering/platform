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
  import { MasterTag, Tag } from '@hcengineering/card'
  import core, { Association, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ObjectBox } from '@hcengineering/view-resources'

  import card from '../../../plugin'

  export let tag: MasterTag | Tag
  export let value: Association | undefined

  let associations: Association[] = []
  let associationIds: Ref<Association>[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: void getAssociations(tag)

  async function getAssociations (_tag: MasterTag | Tag): Promise<void> {
    const descendants = hierarchy.getDescendants(_tag._id)
    const leftAssociations = await client.findAll(core.class.Association, { classA: { $in: descendants } })
    const rightAssociations = await client.findAll(core.class.Association, { classB: { $in: descendants } })

    associations = leftAssociations
      .concat(rightAssociations)
      .filter((value, index, self) => index === self.findIndex((obj) => obj._id === value._id))
    associationIds = associations.map((value) => value._id)
  }
  function onSelect (event: CustomEvent<Ref<Association>>): void {
    value = associations.find((value) => value._id === event.detail)
  }
</script>

<ObjectBox
  _class={core.class.Association}
  showNavigate={false}
  label={card.string.EditView}
  on:change={onSelect}
  value={value?._id}
  docQuery={{
    _id: { $in: associationIds }
  }}
/>
