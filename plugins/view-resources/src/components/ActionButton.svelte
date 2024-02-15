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
  import { Doc, Ref } from '@hcengineering/core'
  import { Action, ViewContextType } from '@hcengineering/view'
  import { getClient } from '@hcengineering/presentation'
  import { filterAvailableActions, invokeAction } from '../actions'
  import view from '../plugin'

  type $$Props = Omit<ComponentProps<Button>, 'icon' | 'label'> & {
    id: Ref<Action>
    object: Doc | Doc[]
    mode?: ViewContextType
  }
  export let disabled: boolean = false
  export let id: Ref<Action>
  export let object: Doc | Doc[]
  export let mode: ViewContextType = 'context'

  const client = getClient()

  let action: Action | null = null
  $: void client
    .findOne(view.class.Action, {
      'context.mode': mode,
      _id: id
    })
    .then((result) => {
      action = result ?? null
    })

  let isAvailable = false
  $: if (action !== null) {
    void filterAvailableActions([action], client, object).then((result) => {
      isAvailable = result[0] === action
    })
  }

  let isBeingInvoked = false
</script>

{#if action !== null && isAvailable}
  <Button
    {...$$props}
    icon={action.icon}
    label={action.label}
    disabled={disabled || isBeingInvoked}
    on:click={async (event) => {
      if (action !== null) {
        isBeingInvoked = true
        await invokeAction(object, event, action)
        isBeingInvoked = false
      }
    }}
  />
{/if}
