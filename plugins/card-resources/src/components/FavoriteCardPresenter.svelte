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
  import { Card, FavoriteCard } from '@hcengineering/card'
  import { Asset } from '@hcengineering/platform'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { ObjectPresenterType } from '@hcengineering/view'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'

  import card from '../plugin'
  import CardPresenter from './CardPresenter.svelte'

  export let value: WithLookup<FavoriteCard> | Ref<FavoriteCard> | undefined
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

  const query = createQuery()
  let doc: Card | undefined = undefined

  $: if (typeof value === 'string') {
    query.query(
      card.class.FavoriteCard,
      { _id: value },
      (res) => {
        doc = res[0]?.$lookup?.attachedTo
      },
      {
        limit: 1,
        lookup: {
          attachedTo: card.class.Card
        }
      }
    )
  } else if (value?.$lookup?.attachedTo != null) {
    doc = value.$lookup.attachedTo
  } else {
    doc = undefined
    query.unsubscribe()
  }
</script>

<CardPresenter
  value={doc}
  {disabled}
  {onClick}
  {shouldShowAvatar}
  {noUnderline}
  {colorInherit}
  {noSelect}
  {inline}
  {showParent}
  {kind}
  {type}
  {icon}
  on:click
/>
