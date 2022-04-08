<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import board from '@anticrm/board'
  import type { Card, CardAction } from '@anticrm/board'
  import { IntlString, getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Button, Label } from '@anticrm/ui'

  import plugin from '../../plugin'
  import { cardActionSorter, getCardActions } from '../../utils/CardActionUtils'

  export let value: Card
  const client = getClient()

  const addToCardActions: CardAction[] = []
  const automationActions: CardAction[] = []
  const actions: CardAction[] = []

  let actionGroups: { label: IntlString; actions: CardAction[] }[] = []

  getCardActions(client).then(async (result) => {
    for (const action of result) {
      let supported = true
      if (action.supported) {
        const supportedHandler = await getResource(action.supported)
        supported = supportedHandler(value, client)
      }
      if (supported) {
        if (action.type === board.cardActionType.AddToCard) {
          addToCardActions.push(action)
        } else if (action.type === board.cardActionType.Automation) {
          automationActions.push(action)
        } else if (action.type === board.cardActionType.Action) {
          actions.push(action)
        }
      }
    }

    actionGroups = [
      {
        label: plugin.string.AddToCard,
        actions: addToCardActions.sort(cardActionSorter)
      },
      {
        label: plugin.string.Automation,
        actions: automationActions.sort(cardActionSorter)
      },
      {
        label: plugin.string.Actions,
        actions: actions.sort(cardActionSorter)
      }
    ]
  })
</script>

{#if value}
  <div class="flex-col flex-gap-3">
    {#each actionGroups as group}
      {#if group.actions.length > 0}
        <div class="flex-col flex-gap-1">
          <Label label={group.label} />
          {#each group.actions as action}
            <Button
              icon={action.icon}
              label={action.label}
              kind={action.kind ?? 'no-border'}
              justify="left"
              on:click={async () => {
                if (action.handler) {
                  const handler = await getResource(action.handler)
                  handler(value, client)
                }
              }}
            />
          {/each}
        </div>
      {/if}
    {/each}
  </div>
{/if}
