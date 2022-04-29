<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { Card, CardAction } from '@anticrm/board'
  import { getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Button, Component } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  import board from '../../plugin'
  import { cardActionSorter, getCardActions } from '../../utils/CardActionUtils'
  import { openCardPanel } from '../../utils/CardUtils'

  export let value: Card
  const client = getClient()
  const dispatch = createEventDispatcher()

  let actions: CardAction[] = []

  function openCard () {
    openCardPanel(value)
    dispatch('close')
  }

  async function fetch () {
    actions = []
    const result = await getCardActions(client, { isInline: true })
    for (const action of result) {
      if (!action.supported) {
        actions.push(action)
      } else {
        const supportedHandler = await getResource(action.supported)
        if (supportedHandler(value, client)) {
          actions.push(action)
        }
      }
    }
    actions = actions.sort(cardActionSorter)
  }

  fetch()
</script>

{#if value && !value.isArchived}
  <div class="flex-col flex-gap-1">
    <Button icon={board.icon.Card} label={board.string.OpenCard} kind="no-border" justify="left" on:click={openCard} />
    {#each actions as action}
      {#if action.component}
        <Component is={action.component} props={{ object: value, isInline: true }}>
          <slot />
        </Component>
      {:else}
        <Button
          icon={action.icon}
          label={action.label}
          kind="no-border"
          justify="left"
          on:click={async (e) => {
            if (action.handler) {
              const handler = await getResource(action.handler)
              handler(value, client, e)
            }
          }}
        />
      {/if}
    {/each}
  </div>
{/if}
