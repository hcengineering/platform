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
  import { AnyAttribute, ArrOf, Ref, RefTo } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    eventToHTMLElement,
    IconWithEmoji,
    Label,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'
  import CardsPopup from './CardsPopup.svelte'

  export let value: Ref<Card>[] | undefined
  export let readonly: boolean = false
  export let label: IntlString | undefined
  export let onChange: ((value: any) => void) | undefined
  export let attribute: AnyAttribute

  export let focusIndex: number | undefined = undefined
  export let kind: ButtonKind = 'ghost'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-content'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: _class = ((attribute?.type as ArrOf<RefTo<Card>>)?.of as RefTo<Card>)?.to

  const handleOpen = (event: MouseEvent): void => {
    if (onChange === undefined) {
      return
    }
    event.stopPropagation()

    if (readonly) {
      return
    }

    showPopup(
      CardsPopup,
      { selectedObjects: value, _class, multiSelect: true },
      eventToHTMLElement(event),
      undefined,
      change
    )
  }

  const change = (value: Ref<Card>[]): void => {
    onChange?.(value)
    dispatch('change', value)
  }

  let docs: Card[] = []

  const query = createQuery()
  $: query.query(card.class.Card, { _id: { $in: value ?? [] } }, (res) => {
    docs = res
  })

  $: clazz = _class !== undefined ? (hierarchy.findClass(_class) as MasterTag) : undefined

  $: icon = clazz?.icon === view.ids.IconWithEmoji ? IconWithEmoji : clazz?.icon
  $: iconProps = clazz?.icon === view.ids.IconWithEmoji ? { icon: clazz?.color } : {}

  $: emptyLabel = label ?? clazz?.label ?? card.string.Card
</script>

<Button
  showTooltip={!readonly ? { label } : undefined}
  {justify}
  {focusIndex}
  {width}
  {size}
  {icon}
  {iconProps}
  {kind}
  disabled={readonly}
  on:click={handleOpen}
>
  <div slot="content" class="overflow-label">
    {#if docs.length === 1}
      {docs[0].title}
    {:else if docs.length > 1}
      <div class="lower">
        {docs.length}
        <Label label={card.string.Cards} />
      </div>
    {:else}
      <Label label={emptyLabel} />
    {/if}
  </div>
</Button>
