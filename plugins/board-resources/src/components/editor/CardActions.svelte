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
  import type { Card, CardAction } from '@anticrm/board'
  import { IntlString, getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Button, Component, Label } from '@anticrm/ui'

  export let value: Card
  const client = getClient()

  const actionGroups: { label: IntlString; actions: CardAction[] }[] = []
</script>

{#if value}
  <div class="flex-col flex-gap-3">
    {#each actionGroups as group}
      {#if group.actions.length > 0}
        <div class="flex-col flex-gap-1">
          <Label label={group.label} />
          {#each group.actions as action}
            {#if action.component}
              <Component is={action.component} props={{ object: value }}>
                <slot />
              </Component>
            {:else}
              <Button
                icon={action.icon}
                label={action.label}
                kind={action.kind ?? 'no-border'}
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
    {/each}
  </div>
{/if}
