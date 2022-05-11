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
  import { Class, Doc, Ref } from '@anticrm/core'
  import presentation, { AttributesBar, getClient, KeyedAttribute } from '@anticrm/presentation'
  import { ActionIcon, IconAdd, Label, showPopup } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import { collectionsFilter, getFiltredKeys } from '../utils'

  export let object: Doc
  export let objectClass: Class<Doc>
  export let to: Ref<Class<Doc>> | undefined
  export let ignoreKeys: string[] = []
  export let vertical: boolean
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let keys: KeyedAttribute[] = []

  function updateKeys (ignoreKeys: string[]): void {
    const filtredKeys = getFiltredKeys(hierarchy, objectClass._id, ignoreKeys, to)
    keys = collectionsFilter(hierarchy, filtredKeys, false)
  }

  $: updateKeys(ignoreKeys)

  const dispatch = createEventDispatcher()
</script>

{#if vertical}
  <div class="flex-between text-sm mb-4">
    <Label label={objectClass.label} />
    <ActionIcon
      label={presentation.string.Create}
      icon={IconAdd}
      size="small"
      action={() => {
        showPopup(view.component.CreateAttribute, { _class: objectClass._id }, 'top', () => {
          updateKeys(ignoreKeys)
          dispatch('update')
        })
      }}
    />
  </div>
{/if}
{#if keys.length || !vertical}
  <AttributesBar {object} {keys} {vertical} />
{/if}
