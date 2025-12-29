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
  import { Card, MasterTag } from '@hcengineering/card'
  import core, { Ref, TypeIdentifier } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, tooltip } from '@hcengineering/ui'
  import { ObjectPresenterType } from '@hcengineering/view'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'

  import card from '../plugin'
  import CardIcon from './CardIcon.svelte'
  import ParentNamesPresenter from './ParentNamesPresenter.svelte'

  export let value: Card | Ref<Card> | undefined
  export let disabled: boolean = false
  export let onClick: (() => void) | undefined = undefined
  export let shouldShowAvatar: boolean = false
  export let noUnderline: boolean = disabled
  export let colorInherit: boolean = false
  export let noSelect: boolean = true
  export let inline = false
  export let showParent: boolean = false
  export let type: ObjectPresenterType = 'link'
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let showVersion: boolean = true

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

  $: _class = cardObj && (client.getHierarchy().getClass(cardObj?._class) as MasterTag)
  $: icon = _class && _class.icon

  $: ids = getIds(cardObj)

  function getIds (val: Card | undefined): string {
    if (val === undefined) return ''
    const h = client.getHierarchy()
    const attrs = h.getAllAttributes(val._class, core.class.Doc)
    const res: string[] = []
    for (const [k, v] of attrs) {
      if (v.type._class === core.class.TypeIdentifier) {
        const type = v.type as TypeIdentifier
        const str = (val as any)[k]
        if (type.showInPresenter === true && str !== undefined) {
          res.push(str)
        }
      }
    }
    return res.join(' ')
  }

  $: version = getVersion(cardObj)

  function getVersion (val: Card | undefined): string {
    if (val === undefined) return ''
    const h = client.getHierarchy()
    const mixin = h.classHierarchyMixin(val._class, core.mixin.VersionableClass)
    if (mixin?.enabled) {
      return 'v' + (val.version ?? 1)
    }
    return ''
  }
</script>

{#if inline && cardObj}
  <ObjectMention object={cardObj} {disabled} {onClick} component={card.component.EditCard} />
{:else if cardObj}
  {#if type === 'link'}
    {#if showParent}
      <ParentNamesPresenter value={cardObj}>
        <DocNavLink
          object={cardObj}
          {onClick}
          {disabled}
          {noUnderline}
          {colorInherit}
          {noSelect}
          inline
          component={card.component.EditCard}
          shrink={1}
          title={cardObj?.title}
        >
          {#if shouldShowAvatar}
            <div class="icon" use:tooltip={{ label: _class?.label ?? card.string.Card }}>
              <CardIcon value={cardObj} />
            </div>
          {/if}
          <span class="overflow-label">
            {ids}
            {cardObj.title}
            {#if showVersion}
              {version}
            {/if}
            <slot name="details" />
          </span>
        </DocNavLink>
      </ParentNamesPresenter>
    {:else}
      <DocNavLink
        object={cardObj}
        {onClick}
        {disabled}
        {noUnderline}
        {colorInherit}
        {noSelect}
        inline
        component={card.component.EditCard}
        shrink={1}
        title={cardObj?.title}
      >
        {#if shouldShowAvatar}
          <div class="icon" use:tooltip={{ label: _class?.label ?? card.string.Card }}>
            <CardIcon value={cardObj} />
          </div>
        {/if}
        <span class="overflow-label cropped-text-presenter">
          {ids}
          {cardObj.title}
          {#if showVersion}
            {version}
          {/if}
          <slot name="details" />
        </span>
      </DocNavLink>
    {/if}
  {:else}
    <span class="overflow-label" class:select-text={!noSelect} use:tooltip={{ label: getEmbeddedLabel(cardObj.title) }}>
      {ids}
      {cardObj.title}
      {#if showVersion}
        {version}
      {/if}
    </span>
  {/if}
{/if}

<style lang="scss">
  .icon {
    margin-right: 0.5rem;
    color: var(--theme-dark-color);
  }
</style>
