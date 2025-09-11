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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getAttributeEditor, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getContext } from '../../utils'
  import ProcessAttribute from '../ProcessAttribute.svelte'

  export let process: Process
  export let _class: Ref<Class<Doc>>
  export let key: string
  export let object: Record<string, any>
  export let allowRemove: boolean = false
  export let forbidValue: boolean = false
  export let allowArray: boolean = false
  export let objectKey: string | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function onChange (value: any | undefined): void {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (object as any)[objectKey ?? key]
    } else {
      ;(object as any)[objectKey ?? key] = value
    }
    dispatch('change', { value, object })
  }

  $: value = object[objectKey ?? key]

  $: attribute = hierarchy.getAttribute(_class, key)
  $: presenterClass = getAttributePresenterClass(hierarchy, attribute.type)
  $: context = getContext(client, process, presenterClass.attrClass, presenterClass.category, attribute._id)

  let editor: AnySvelteComponent | undefined

  function getBaseEditor (_class: Ref<Class<Doc>>, key: string): void {
    void getAttributeEditor(client, _class, key).then((p) => {
      editor = p
    })
  }

  $: getBaseEditor(_class, key)
</script>

<ProcessAttribute
  {process}
  {context}
  {editor}
  {attribute}
  {presenterClass}
  {value}
  masterTag={process.masterTag}
  {allowRemove}
  {allowArray}
  {forbidValue}
  on:remove
  on:change={(e) => {
    onChange(e.detail)
  }}
/>
