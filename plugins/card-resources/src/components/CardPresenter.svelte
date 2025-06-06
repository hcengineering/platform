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
  import { Card } from '@hcengineering/card'
  import { Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon, tooltip } from '@hcengineering/ui'
  import { ObjectPresenterType } from '@hcengineering/view'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'
  import { getClient } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'

  import ParentNamesPresenter from './ParentNamesPresenter.svelte'
  import card from '../plugin'

  export let value: Card | Ref<Card> | undefined
  export let disabled: boolean = false
  export let onClick: (() => void) | undefined = undefined
  export let shouldShowAvatar: boolean = false
  export let noUnderline: boolean = disabled
  export let colorInherit: boolean = false
  export let noSelect: boolean = true
  export let inline = false
  export let showParent: boolean = false
  export let kind: 'list' | undefined = undefined
  export let type: ObjectPresenterType = 'link'
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  const client = getClient()
  let cardObj: Card | undefined = undefined

  $: {
    if (typeof value === 'string') {
      void readCard(value)
    } else {
      cardObj = value
    }
  }

  async function readCard (ref: Ref<Card>): Promise<void> {
    cardObj = await client.findOne(card.class.Card, { _id: ref })
  }
</script>

{#if inline && cardObj}
  <ObjectMention object={cardObj} {disabled} {onClick} component={card.component.EditCard} />
{:else if cardObj}
  {#if type === 'link'}
    <div class="flex-row-center">
      {#if showParent}
        <ParentNamesPresenter value={cardObj} />
      {/if}
      <DocNavLink
        object={cardObj}
        {onClick}
        {disabled}
        {noUnderline}
        {inline}
        {colorInherit}
        component={card.component.EditCard}
        shrink={0}
      >
        <span class="presenterRoot" class:cursor-pointer={!disabled}>
          {#if shouldShowAvatar}
            <div class="icon" use:tooltip={{ label: card.string.Card }}>
              <Icon icon={icon ?? card.icon.Card} size={'small'} />
            </div>
          {/if}
          <span class="overflow-label" class:select-text={!noSelect} title={cardObj?.title}>
            {cardObj.title}
            <slot name="details" />
          </span>
        </span>
      </DocNavLink>
    </div>
  {:else}
    <span class="overflow-label" class:select-text={!noSelect} use:tooltip={{ label: getEmbeddedLabel(cardObj.title) }}>
      {cardObj.title}
    </span>
  {/if}
{/if}

<style lang="scss">
  .presenterRoot {
    display: flex;
    align-items: center;
    flex-shrink: 0;

    .icon {
      margin-right: 0.5rem;
      color: var(--theme-dark-color);
    }
  }
</style>
