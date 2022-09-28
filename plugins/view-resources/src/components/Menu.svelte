<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { createEventDispatcher, afterUpdate } from 'svelte'
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import type { Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Action, Menu } from '@hcengineering/ui'
  import type { ActionGroup, ViewContextType } from '@hcengineering/view'
  import { getActions, invokeAction } from '../actions'

  export let object: Doc | Doc[]
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let actions: Action[] = []
  export let mode: ViewContextType | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  let loaded = 0

  const order: Record<ActionGroup, number> = {
    create: 1,
    edit: 2,
    copy: 3,
    associate: 4,
    tools: 5,
    other: 6
  }

  getActions(client, object, baseMenuClass, mode).then((result) => {
    actions = result
      .sort((a, b) => order[a.context.group ?? 'other'] - order[b.context.group ?? 'other'])
      .map((a) => ({
        label: a.label,
        icon: a.icon as Asset,
        inline: a.inline,
        group: a.context.group ?? 'other',
        action: async (_: any, evt: Event) => {
          invokeAction(object, evt, a.action, a.actionProps)
        },
        component: a.actionPopup,
        props: { ...a.actionProps, value: object }
      }))
    loaded = 1
  })

  afterUpdate(() => dispatch('changeContent'))
</script>

{#if loaded}
  <Menu {actions} on:close on:changeContent={() => dispatch('changeContent')} />
{/if}
