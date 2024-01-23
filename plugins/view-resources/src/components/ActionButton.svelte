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
  import { ComponentProps } from 'svelte'
  import { Button } from '@hcengineering/ui'
  import { Ref } from '@hcengineering/core'
  import { Action } from '@hcengineering/view'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { invokeAction, queryAction } from '../actions'

  type T = $$Generic<Doc>

  type $$Props = Omit<ComponentProps<Button>, 'icon' | 'label'> & {
    id: Ref<Action<T>>
    object: T | T[]
  }
  export let id: Ref<Action<T>>
  export let object: T | T[]

  let action: Action | null = null
  const query = createQuery()
  const client = getClient()
  $: queryAction(query, client, object, id as Ref<Action>, (result) => {
    action = result ?? null
  })
</script>

{#if action !== null}
  <Button
    {...$$props}
    icon={action.icon}
    label={action.label}
    on:click={async (event) => {
      if (action !== null) {
        await invokeAction(object, event, action.action, action.actionProps)
      }
    }}
  />
{/if}
