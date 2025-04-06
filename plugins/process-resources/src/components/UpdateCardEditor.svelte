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
  import core, { AnyAttribute, Class, Ref } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Process, State, Step } from '@hcengineering/process'
  import { createEventDispatcher } from 'svelte'
  import ParamsEditor from './ParamsEditor.svelte'
  import { Button, eventToHTMLElement, SelectPopup, showPopup } from '@hcengineering/ui'

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

  function getKeys (_class: Ref<Class<MasterTag>>): AnyAttribute[] {
    const ignoreKeys = ['_class', 'content', 'parent', 'attachments', 'todos']
    const attributes = hierarchy.getAllAttributes(_class, core.class.Doc)
    const res: AnyAttribute[] = []
    for (const [key, attr] of attributes) {
      if (attr.hidden === true) continue
      if (ignoreKeys.includes(key)) continue
      res.push(attr)
    }
    return res
  }

  let keys = Object.keys(params)

  $: allAttrs = getKeys(process.masterTag)
  $: possibleAttrs = allAttrs.filter((attr) => !keys.includes(attr.name))

  function addKey (key: string): void {
    keys = [...keys, key]
  }

  function onAdd (e: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: possibleAttrs.map((p) => {
          return { id: p.name, label: p.label }
        })
      },
      eventToHTMLElement(e),
      (res) => {
        if (res != null) {
          addKey(res)
        }
      }
    )
  }

  function remove (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      const key = e.detail.key
      keys = keys.filter((k) => k !== key)
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (params as any)[key]
      ;(step.params as any) = params
      dispatch('change', step)
    }
  }
</script>

<ParamsEditor
  _class={process.masterTag}
  {process}
  {state}
  {keys}
  {params}
  allowRemove
  on:remove={remove}
  on:change={change}
/>
{#if possibleAttrs.length > 0}
  <div class="flex-center mt-4">
    <Button label={presentation.string.Add} width={'100%'} kind={'link-bordered'} size={'large'} on:click={onAdd} />
  </div>
{/if}
