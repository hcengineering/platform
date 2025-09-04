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
  import cardPlugin, { MasterTag, CardSpace, Card } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'

  import NavigatorVariant from './NavigatorVariant.svelte'
  import type { NavigatorConfig } from '../../types'
  import { getRootType } from '../../utils'

  export let types: MasterTag[] = []
  export let config: NavigatorConfig
  export let space: CardSpace
  export let applicationId: string
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined
  export let selectedSpecial: string | undefined = undefined

  const client = getClient()

  let filteredTypes: MasterTag[] = []
  $: filteredTypes = types.filter((it) => space.types.includes(getRootType(client.getHierarchy(), it._id)))
</script>

<TreeNode
  _id={space._id}
  icon={cardPlugin.icon.Space}
  title={space.name}
  type={'nested'}
  on:dragstart={(evt) => {
    evt.preventDefault()
  }}
>
  <div class="flex-col ml-2">
    <NavigatorVariant
      types={filteredTypes}
      {space}
      {config}
      {selectedType}
      {selectedCard}
      {selectedSpecial}
      {applicationId}
      on:selectType
      on:selectCard
      on:favorites
    />
  </div>
</TreeNode>

<style lang="scss">
</style>
