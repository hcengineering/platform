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
  import { TreeNode } from '@hcengineering/view-resources'
  import { Ref } from '@hcengineering/core'
  import cardPlugin, { MasterTag, CardSpace, Card } from '@hcengineering/card'
  import { Label } from '@hcengineering/communication-types'
  import NavigatorHierarchy from './NavigatorHierarchy.svelte'

  import type { NavigatorConfig } from './types'

  export let space: CardSpace
  export let types: MasterTag[] = []
  export let labels: Label[] = []
  export let config: NavigatorConfig
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined

  let filteredTypes: MasterTag[] = []

  $: filteredTypes = types.filter((it) => space.types.includes(it._id))
</script>

<div class="flex-col relative">
  <TreeNode
    _id={space._id}
    icon={cardPlugin.icon.Card}
    title={space.name}
    type={'nested'}
    on:dragstart={(evt) => {
      evt.preventDefault()
    }}
  >
    <NavigatorHierarchy
      types={filteredTypes}
      {config}
      {labels}
      {selectedType}
      {selectedCard}
      on:selectType
      on:selectCard
      on:empty
    />
  </TreeNode>
</div>

<style lang="scss">
</style>
