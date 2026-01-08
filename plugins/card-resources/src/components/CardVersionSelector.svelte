<!--
//
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
//
-->
<script lang="ts">
  import { Card, cardId } from '@hcengineering/card'
  import core, { Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, DropdownLabels, DropdownTextItem, getCurrentLocation, navigate, showPopup } from '@hcengineering/ui'
  import card from '../plugin'
  import NewVersionPopup from './NewVersionPopup.svelte'

  export let value: Card

  const client = getClient()
  const h = client.getHierarchy()

  $: enabled = h.classHierarchyMixin(value._class, core.mixin.VersionableClass)?.enabled

  let versions: Card[] = []

  const query = createQuery()
  $: if (enabled === true) {
    query.query(
      card.class.Card,
      {
        baseId: value.baseId
      },
      (res) => {
        versions = res
      }
    )
  } else {
    query.unsubscribe()
    versions = []
  }

  let items: DropdownTextItem[] = []

  $: items = versions.map((p) => {
    return {
      id: p._id,
      label: 'v' + p.version
    }
  })

  function navigateTo (_id: Ref<Card>): void {
    const loc = getCurrentLocation()
    loc.path[2] = cardId
    loc.path[3] = _id
    navigate(loc)
  }

  function selectHandler (e: CustomEvent): void {
    const val = e.detail
    if (val != null) {
      navigateTo(val)
    }
  }

  function newVersion (): void {
    showPopup(NewVersionPopup, {
      value
    })
  }
</script>

{#if enabled}
  <DropdownLabels kind={'link'} {items} on:selected={selectHandler} selected={value._id} />
  {#if value.isLatest}
    <Button label={card.string.NewVersion} on:click={newVersion} />
  {/if}
{/if}
