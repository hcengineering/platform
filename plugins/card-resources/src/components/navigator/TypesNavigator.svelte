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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { getCurrentLocation, navigate, location as locationStore } from '@hcengineering/ui'
  import { MasterTag } from '@hcengineering/card'
  import { TreeNode } from '@hcengineering/view-resources'
  import { GroupsNavModel } from '@hcengineering/workbench'
  import TagHierarchy from './TagHierarchy.svelte'
  import card from '../../plugin'

  export let model: GroupsNavModel

  let classes: MasterTag[] = []
  let _class: Ref<Class<Doc>> | undefined

  const query = createQuery()
  query.query(card.class.MasterTag, {}, (res) => {
    classes = res.filter((it) => it.removed !== true).sort((a, b) => a.label.localeCompare(b.label))
  })

  function getRootClasses (_classes: MasterTag[]): MasterTag[] {
    return _classes.filter((it) => it.extends === card.class.Card)
  }

  function selectType (type: Ref<MasterTag>): void {
    const loc = getCurrentLocation()
    loc.path[3] = 'type'
    loc.path[4] = type
    loc.path.length = 5
    navigate(loc)
  }

  $: _class = $locationStore.path[4] as Ref<Class<Doc>>
  $: selectedClass = classes.find((it) => it._id === _class)
  $: rootClasses = getRootClasses(classes)
  $: empty = rootClasses === undefined || rootClasses.length === 0
</script>

<div class="flex-col w-full">
  <TreeNode
    _id={'tree-' + model.id}
    label={model.label}
    highlighted={selectedClass !== undefined}
    isFold={!empty}
    {empty}
  >
    <TagHierarchy
      classes={rootClasses}
      allClasses={classes}
      {_class}
      space={undefined}
      currentSpace={undefined}
      on:select={(e) => {
        selectType(e.detail)
      }}
    />
  </TreeNode>
</div>
