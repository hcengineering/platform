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
  import { MasterTag } from '@hcengineering/card'
  import core, { AnyAttribute, Class, Ref } from '@hcengineering/core'
  import { getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { Button, eventToHTMLElement, SelectPopup, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { getCirteriaEditor } from '../../utils'
  import CriteriasEditor from '../criterias/CriteriasEditor.svelte'

  export let readonly: boolean
  export let process: Process
  export let params: Record<string, any>

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function change (e: CustomEvent<any>): void {
    if (readonly || e.detail == null) return
    params = e.detail
    dispatch('change', { params })
  }

  function getKeys (_class: Ref<Class<MasterTag>>): AnyAttribute[] {
    const ignoreKeys = ['_class', 'content', 'parent', 'attachments', 'todos']
    const attributes = hierarchy.getAllAttributes(_class, core.class.Doc)
    const res: AnyAttribute[] = []
    for (const [key, attr] of attributes) {
      if (attr.hidden === true) continue
      if (ignoreKeys.includes(key)) continue
      const presenterClass = getAttributePresenterClass(hierarchy, attr.type)
      const updateCriteria = getCirteriaEditor(presenterClass.attrClass, presenterClass.category)
      const editor = updateCriteria?.editor
      if (editor == null) continue
      res.push(attr)
    }
    return res
  }

  let key: string | undefined = Object.keys(params)[0]

  const allAttrs = getKeys(process.masterTag)

  function onSelect (e: MouseEvent): void {
    const possibleAttrs = allAttrs.filter((attr) => key !== attr.name)
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
          key = res
        }
      }
    )
  }

  function remove (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      if (key !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (params as any)[key]
      }
      key = undefined
      dispatch('change', { params })
    }
  }
</script>

{#if key !== undefined}
  <CriteriasEditor
    keys={[key]}
    _class={process.masterTag}
    {readonly}
    {process}
    {params}
    on:remove={remove}
    on:change={change}
  />
{:else}
  <div class="flex-center mt-4">
    <Button label={view.string.Select} width={'100%'} kind={'link-bordered'} size={'large'} on:click={onSelect} />
  </div>
{/if}
