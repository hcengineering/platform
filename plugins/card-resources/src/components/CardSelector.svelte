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
  import { AnyAttribute, Class, Ref, RefTo } from '@hcengineering/core'
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

  export let value: Ref<Card> | undefined
  export let readonly: boolean = false
  export let label: IntlString = card.string.Card
  export let _class: Ref<Class<Card>>

  export let focusIndex: number | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-content'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const handleOpen = (event: MouseEvent): void => {
    event.stopPropagation()

    if (readonly) {
      return
    }

    showPopup(CardsPopup, { selected: value, _class }, eventToHTMLElement(event), change)
  }

  const change = (val: Card | undefined): void => {
    if (readonly || val == null || value === val._id) {
      return
    }

    value = val._id
    dispatch('change', value)
  }

  let doc: Card | undefined

  const query = createQuery()
  $: if (value !== undefined) {
    query.query(card.class.Card, { _id: value }, (res) => {
      doc = res[0]
    })
  }

  $: _classRef = doc?._class ?? _class
  $: clazz = _classRef !== undefined ? (hierarchy.findClass(_classRef) as MasterTag) : undefined

  $: icon = clazz?.icon === view.ids.IconWithEmoji ? IconWithEmoji : clazz?.icon
  $: iconProps = clazz?.icon === view.ids.IconWithEmoji ? { icon: clazz?.color } : {}
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
    {#if doc}
      {doc.title}
    {:else}
      <Label {label} />
    {/if}
  </div>
</Button>
