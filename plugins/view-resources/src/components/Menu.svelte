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
  import type { Doc } from '@anticrm/core'
  import type { Asset, IntlString, Resource } from '@anticrm/platform'
  import { getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Menu } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { getActions } from '../utils'

  export let object: Doc
  
  let actions: {
    label: IntlString
    icon?: Asset
    action: () => void
  }[] = []

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function invokeAction(action: Resource<(object: Doc) => Promise<void>>) {
    dispatch('close')
    const impl = await getResource(action)
    await impl(object)
  }

  getActions(client, object._class).then(result => { 
    actions = result.map(a => ({
      label: a.label,
      icon: a.icon,
      action: () => { invokeAction(a.action) }
    }) )
  })

</script>

<Menu actions={actions} on:close/>

