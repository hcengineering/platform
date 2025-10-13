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
  import { IconAdd, NavGroup, Action, NavItem, ButtonIcon, showPopup, languageStore } from '@hcengineering/ui'
  import { Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { CardSpace, MasterTag } from '@hcengineering/card'
  import presentation, { IconWithEmoji, getClient } from '@hcengineering/presentation'
  import { translate, getEmbeddedLabel } from '@hcengineering/platform'

  import type { NavigatorConfig } from '../../types'
  import cardPlugin from '../../plugin'
  import CreateCardPopup from '../CreateCardPopup.svelte'

  export let type: MasterTag
  export let level: number = -1
  export let space: CardSpace | undefined = undefined
  export let config: NavigatorConfig
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let empty: boolean = false
  export let active: boolean = false
  export let showIcon: boolean = false

  const dispatch = createEventDispatcher()
  let activeAction: string | undefined = undefined

  async function handleCreateCard (): Promise<void> {
    showPopup(CreateCardPopup, { type: type._id, space }, 'center', async (result) => {
      if (result !== undefined) {
        const card = await getClient().findOne(cardPlugin.class.Card, { _id: result })
        if (card === undefined) return
        dispatch('selectCard', card)
      }
    })
  }

  async function getActions (lang: string): Promise<Action[]> {
    const result: Action[] = []
    const typeString = await translate(type.label, {}, lang)
    const createString = await translate(presentation.string.Create, {}, lang)

    if (config.allowCreate === true) {
      result.push({
        id: 'create-card',
        label: getEmbeddedLabel(`${createString} ${typeString}`),
        icon: IconAdd,
        action: async (): Promise<void> => {
          activeAction = 'create-card'
          await handleCreateCard()
        }
      })
    }

    return result
  }
  let actions: Action[] = []

  $: void getActions($languageStore).then((res) => {
    actions = res
  })
</script>

{#if level > -1}
  <NavItem
    _id={type._id}
    label={type.label}
    icon={type.icon === view.ids.IconWithEmoji ? IconWithEmoji : type.icon}
    iconProps={type.icon === view.ids.IconWithEmoji ? { icon: type.color } : {}}
    isFold
    {empty}
    {level}
    selected={selectedType === type._id}
    on:click={(e) => {
      e.stopPropagation()
      e.preventDefault()
      dispatch('selectType', type)
    }}
  >
    <svelte:fragment slot="dropbox">
      <slot />
    </svelte:fragment>
  </NavItem>
{:else}
  <NavGroup
    _id={type._id}
    categoryName={type._id}
    label={type.label}
    icon={showIcon ? (type.icon === view.ids.IconWithEmoji ? IconWithEmoji : type.icon) : undefined}
    iconProps={type.icon === view.ids.IconWithEmoji ? { icon: type.color } : {}}
    highlighted={active}
    selected={selectedType === type._id}
    {empty}
    isFold
    visible={active}
    type="selectable-header"
    {actions}
    on:click={(e) => {
      e.stopPropagation()
      e.preventDefault()
      dispatch('selectType', type)
    }}
  >
    <div class="mt-0-5" />
    <slot />
    <svelte:fragment slot="actions">
      {#each actions as action}
        <ButtonIcon
          icon={action.icon ?? view.icon.Edit}
          size="extra-small"
          kind="tertiary"
          pressed={activeAction === action.id}
          tooltip={{ label: action.label }}
          on:click={(e) => {
            e.stopPropagation()
            e.preventDefault()
            void action.action(action.props, e)
          }}
        />
      {/each}
    </svelte:fragment>
    <svelte:fragment slot="visible" let:isOpen>
      <div class="mt-0-5" />
      <slot name="visible" {isOpen} />
    </svelte:fragment>
  </NavGroup>
{/if}
