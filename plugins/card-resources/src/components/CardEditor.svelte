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
  import { AnyAttribute, Ref, RefTo } from '@hcengineering/core'
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

  export let value: Ref<Card>
  export let readonly: boolean = false
  export let label: IntlString = card.string.Card
  export let onChange: (value: any) => void
  export let attribute: AnyAttribute

  export let focusIndex: number | undefined = undefined
  export let shouldShowLabel: boolean = true
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-content'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const handleOpen = (event: MouseEvent): void => {
    event.stopPropagation()
    const _class = (attribute.type as RefTo<Card>).to

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
    onChange(value)
  }

  let doc: Card | undefined

  const query = createQuery()
  query.query(card.class.Card, { _id: value }, (res) => {
    doc = res[0]
  })

  $: _classRef = doc?._class ?? (attribute?.type as RefTo<Card>)?.to
  $: _class = _classRef !== undefined ? (hierarchy.findClass(_classRef) as MasterTag) : undefined

  $: icon = _class?.icon === view.ids.IconWithEmoji ? IconWithEmoji : _class?.icon
  $: iconProps = _class?.icon === view.ids.IconWithEmoji ? { icon: _class?.color } : {}
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
