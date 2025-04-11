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
  import { Ref, Space } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { TreeNode } from '@hcengineering/view-resources'
  import { SpacesNavModel } from '@hcengineering/workbench'
  import TagHierarchy from './TagHierarchy.svelte'

  import { CardSpace, MasterTag } from '@hcengineering/card'
  import card from '../../plugin'
  import { onDestroy } from 'svelte'
  import { location } from '@hcengineering/ui'

  export let space: CardSpace
  export let model: SpacesNavModel
  export let currentSpace: Ref<Space> | undefined
  export let forciblyСollapsed: boolean = false

  let classes: MasterTag[] = []
  let allClasses: MasterTag[] = []

  function fillClasses (tags: MasterTag[]): void {
    classes = tags.filter((it) => space.types.includes(it._id)).sort((a, b) => a.label.localeCompare(b.label))
  }

  const query = createQuery()
  query.query(card.class.MasterTag, {}, (res) => {
    const notRemoved = res.filter((it) => it.removed !== true)
    allClasses = notRemoved
    fillClasses(notRemoved)
  })

  let _class: Ref<MasterTag> | undefined

  onDestroy(
    location.subscribe((it) => {
      _class = it.path[4]
    })
  )
</script>

<div class="flex-col relative">
  <TreeNode
    _id={space?._id}
    icon={model.icon}
    title={space.name}
    type={'nested'}
    highlighted={currentSpace === space._id}
    visible={currentSpace === space._id || forciblyСollapsed}
    {forciblyСollapsed}
    on:dragstart={(evt) => {
      evt.preventDefault()
    }}
  >
    <TagHierarchy space={space?._id} {_class} {classes} {currentSpace} {allClasses} on:select />
  </TreeNode>
</div>
