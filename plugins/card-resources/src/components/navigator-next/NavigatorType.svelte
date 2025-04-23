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
  import view from '@hcengineering/view'
  import { IconWithEmoji, IconAdd } from '@hcengineering/ui'
  import { Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { CardSpace, MasterTag } from '@hcengineering/card'
  import { Section, Action } from '@hcengineering/ui-next'
  import { getClient } from '@hcengineering/presentation'

  import type { NavigatorConfig } from '../../types'
  import cardPlugin from '../../plugin'
  import { createCard } from '../../utils'

  export let type: MasterTag
  export let level: number = 0
  export let space: CardSpace | undefined = undefined
  export let config: NavigatorConfig
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let empty: boolean = false
  export let bold: boolean = false

  const dispatch = createEventDispatcher()

  async function handleCreateCard (): Promise<void> {
    if (space === undefined) return
    const _id = await createCard(type._id, space._id)
    const card = await getClient().findOne(cardPlugin.class.Card, { _id })
    if (card === undefined) return
    dispatch('selectCard', card)
  }

  function getActions (): Action[] {
    const result: Action[] = []

    if (config.allowCreate === true && space !== undefined) {
      result.push({
        label: cardPlugin.string.CreateCard,
        icon: IconAdd,
        action: () => {
          void handleCreateCard()
        },
        order: 1
      })
    }

    return result
  }
</script>

<Section
  id={type._id}
  title={type.label}
  {level}
  selected={selectedType === type._id}
  icon={type.icon === view.ids.IconWithEmoji ? IconWithEmoji : type.icon}
  iconProps={type.icon === view.ids.IconWithEmoji ? { icon: type.color } : {}}
  {empty}
  {bold}
  actions={getActions()}
  on:click={() => {
    dispatch('selectType', type)
  }}
>
  <slot />
</Section>
