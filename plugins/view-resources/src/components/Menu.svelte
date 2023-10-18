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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Action, Menu } from '@hcengineering/ui'
  import { ActionGroup, ViewContextType } from '@hcengineering/view'
  import { getActions, invokeAction } from '../actions'

  export let object: Doc | Doc[]
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let actions: Action[] = []
  export let excludedActions: string[] = []
  export let mode: ViewContextType | undefined = undefined
  let resActions = actions

  const client = getClient()

  let loaded = false

  const order: Record<ActionGroup, number> = {
    create: 1,
    edit: 2,
    copy: 3,
    associate: 4,
    tools: 5,
    other: 6,
    remove: 7
  }

  getActions(client, object, baseMenuClass, mode).then((result) => {
    const filtered = result.filter((a) => {
      if (excludedActions.includes(a._id)) {
        return false
      }
      if (a.override && a.override.filter((o) => excludedActions.includes(o)).length > 0) {
        return false
      }
      return true
    })
    const newActions: Action[] = filtered.map((a) => ({
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
    resActions = [...newActions, ...actions].sort(
      (a, b) => (order as any)[a.group ?? 'other'] - (order as any)[b.group ?? 'other']
    )
    if (resActions.length > 0) {
      loaded = true
    }
  })
</script>

{#if loaded}
  <Menu actions={resActions} on:close on:changeContent />
{/if}
