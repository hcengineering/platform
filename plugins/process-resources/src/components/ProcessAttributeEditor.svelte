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
  import { Process, State } from '@hcengineering/process'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { getContext } from '../utils'
  import ProcessAttribute from './ProcessAttribute.svelte'

  export let process: Process
  export let state: State
  export let _class: Ref<Class<Doc>>
  export let key: string
  export let object: Record<string, any>

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function onChange (value: any | undefined): void {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (object as any)[key]
    } else {
      ;(object as any)[key] = value
    }
  }

  $: value = object[key]

  $: attribute = hierarchy.getAttribute(_class, key)
  $: presenterClass = getAttributePresenterClass(hierarchy, attribute)
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
  {context}
  {editor}
  {attribute}
  {presenterClass}
  {value}
  on:change={(e) => {
    onChange(e.detail)
  }}
/>
