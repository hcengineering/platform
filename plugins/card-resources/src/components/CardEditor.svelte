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
  import { AnyAttribute, Ref, RefTo } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'
  import CardSelector from './CardSelector.svelte'
  import CardPresenter from './CardPresenter.svelte'

  export let value: Ref<Card> | undefined
  export let readonly: boolean = false
  export let label: IntlString = card.string.Card
  export let onChange: (value: any) => void
  export let attribute: AnyAttribute

  export let focusIndex: number | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-content'

  const dispatch = createEventDispatcher()

  const change = (val: Ref<Card> | undefined): void => {
    dispatch('change', val)
    onChange(val)
  }

  const _class = (attribute?.type as RefTo<Card>)?.to ?? card.class.Card
</script>

{#if readonly || attribute?.readonly}
  <CardPresenter {value} noUnderline />
{:else}
  <CardSelector
    {value}
    {readonly}
    {label}
    {_class}
    {focusIndex}
    {kind}
    {size}
    {justify}
    {width}
    on:change={(e) => {
      change(e.detail)
    }}
  />
{/if}
