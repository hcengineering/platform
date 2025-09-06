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
  import { getClient, createQuery } from '@hcengineering/presentation'
  import { Button, ButtonSize, Component, Icon, IconSize, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { IconPicker } from '@hcengineering/view-resources'
  import { Ref } from '@hcengineering/core'

  import card from '../plugin'
  import { getCardIconInfo } from '../utils'

  export let value: Card | undefined | null = undefined
  export let _id: Ref<Card> | undefined = undefined
  export let size: IconSize = 'small'
  export let buttonSize: ButtonSize = 'medium'
  export let editable: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let doc: Card | undefined = value ?? undefined

  $: if (_id !== undefined && value == null) {
    query.query(card.class.Card, { _id }, (res) => {
      doc = res[0]
    })
  } else {
    doc = value ?? undefined
    query.unsubscribe()
  }

  async function chooseIcon (): Promise<void> {
    if (doc === undefined) return
    const { icon, color } = doc
    const update = async (result: any): Promise<void> => {
      if (result !== undefined && result !== null && doc !== undefined) {
        await client.update(doc, { icon: result.icon, color: result.color })
      }
    }
    showPopup(IconPicker, { icon, color }, 'top', update, update)
  }

  $: iconData = getCardIconInfo(doc)
  $: iconMixin = doc ? hierarchy.classHierarchyMixin(doc._class, view.mixin.ObjectIcon) : undefined
</script>

{#if iconMixin && iconMixin._id !== card.class.Card}
  <Component is={iconMixin.component} props={{ value: doc, size, editable }} />
{:else if editable}
  <Button
    size={buttonSize}
    kind={'ghost'}
    noFocus
    icon={iconData.icon}
    iconProps={{ ...iconData.props, size }}
    showTooltip={{ label: view.string.Icon, direction: 'bottom' }}
    on:click={chooseIcon}
  />
{:else}
  <Icon icon={iconData.icon} iconProps={iconData.props} {size} />
{/if}
