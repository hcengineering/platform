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
  import { Card, FavoriteCard, MasterTag } from '@hcengineering/card'
  import core, { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import { IconMoreV, NavItem, Action, ButtonIcon } from '@hcengineering/ui'
  import { NotificationContext } from '@hcengineering/communication-types'
  import view from '@hcengineering/view'
  import { showMenu } from '@hcengineering/view-resources'
  import preference from '@hcengineering/preference'

  import cardPlugin from '../../plugin'
  import { CardsNavigatorConfig } from '../../types'
  import { getCardIconInfo } from '../../utils'
  import { CardIcon } from '../../index'

  export let type: Ref<MasterTag> | undefined = undefined
  export let card: Card
  export let context: NotificationContext | undefined = undefined
  export let favorite: FavoriteCard | undefined = undefined
  export let applicationId: string
  export let selectedCard: Ref<Card> | undefined = undefined
  export let config: CardsNavigatorConfig

  const dispatch = createEventDispatcher()
  const client = getClient()

  let activeAction: string | undefined = undefined

  function toggleFavoriteCard (): void {
    if (favorite !== undefined) {
      void client.remove(favorite)
    } else {
      void client.createDoc(cardPlugin.class.FavoriteCard, core.space.Workspace, {
        application: applicationId,
        attachedTo: card._id
      })
    }
  }

  const actions: Action[] = [
    {
      id: 'menu',
      label: view.string.MoreActions,
      icon: IconMoreV,
      action: async (_, e): Promise<void> => {
        activeAction = 'menu'
        showMenu(
          e as MouseEvent,
          {
            object: card,
            actions: [
              {
                label: favorite ? preference.string.Unstar : preference.string.Star,
                icon: view.icon.Star,
                group: 'edit',
                action: toggleFavoriteCard
              }
            ]
          },
          () => {
            activeAction = undefined
          }
        )
      }
    }
  ]

  function getCardTitle (card: Card): string {
    if ((card?.parentInfo?.length ?? 0) === 0) return card.title
    const parent = card.parentInfo[card.parentInfo.length - 1]
    if (parent != null) {
      return `${card.title} (${parent.title})`
    }

    return card.title
  }

  $: iconInfo = getCardIconInfo(card)
</script>

<NavItem
  _id={card._id}
  icon={config.showCardIcon ? iconInfo.icon : undefined}
  iconProps={iconInfo.props}
  iconSize="small"
  title={getCardTitle(card)}
  selected={selectedCard === card._id}
  withBackground={true}
  type="type-object"
  showMenu={activeAction === 'menu'}
  on:click={(e) => {
    e.stopPropagation()
    e.preventDefault()
    dispatch('selectCard', card)
  }}
  on:contextmenu
>
  <svelte:fragment slot="icon">
    <CardIcon value={card} _id={card._id} size="small" editable={false} />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#each actions as action}
      {#if action.icon}
        <ButtonIcon
          icon={action.icon}
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
      {/if}
    {/each}
  </svelte:fragment>

  <svelte:fragment slot="notify">
    {#if context && (context.totalNotifications ?? 0) > 0}
      <div class="antiHSpacer" />
      <div class="notify">
        <div class="notifyMarker">
          {context.totalNotifications}
        </div>
      </div>
      <div class="antiHSpacer" />
    {/if}
  </svelte:fragment>
</NavItem>

<style lang="scss">
  .notify {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: 1rem;
    height: 1rem;
  }
  .notifyMarker {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 0.5rem;
    font-weight: 700;
    background-color: var(--global-higlight-Color);
    color: var(--global-on-accent-TextColor);
    min-width: 1rem;
    height: 1rem;
    font-size: 0.5rem;
    padding: 0 0.25rem;
  }
</style>
