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
  import { Card, MasterTag } from '@hcengineering/card'
  import core, { Class, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process, State, Step } from '@hcengineering/process'
  import { createEventDispatcher } from 'svelte'
  import ParamsEditor from './ParamsEditor.svelte'

  export let process: Process
  export let state: State
  export let step: Step<Card>

  let params = step.params

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      params = e.detail
      ;(step.params as any) = e.detail
      dispatch('change', step)
    }
  }

  function getKeys (_class: Ref<Class<MasterTag>>): string[] {
    const ignoreKeys = ['_class', 'content', 'parent', 'attachments', 'todos']
    const attributes = hierarchy.getAllAttributes(_class, core.class.Doc)
    const res: string[] = []
    for (const [key, attr] of attributes) {
      if (attr.hidden === true) continue
      if (attr.readonly === true) continue
      if (ignoreKeys.includes(key)) continue
      res.push(key)
    }
    return res
  }

  $: keys = getKeys(process.masterTag)
</script>

<ParamsEditor _class={process.masterTag} {process} {state} {keys} {params} on:change={change} />
