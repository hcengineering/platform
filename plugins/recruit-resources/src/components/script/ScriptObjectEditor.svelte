<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import { type Obj, type PropertyType } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type { ScriptAttribute } from '@hcengineering/recruit'
  import AttributeTitleEditor from './AttributeTitleEditor.svelte'
  import PropertyEditor from './PropertyEditor.svelte'

  type T = $$Generic<Obj>
  export let value: T
  export let change: ((value: T) => Promise<boolean>) | null

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let attributes: Array<ScriptAttribute> = []
  $: {
    attributes = [...hierarchy.getOwnAttributes(value._class).values()] as Array<ScriptAttribute>
  }

  function getProperty (attribute: ScriptAttribute): PropertyType {
    return value[attribute.name as keyof T]
  }

  async function changeProperty (attribute: ScriptAttribute, propertyValue: PropertyType): Promise<boolean> {
    if (change === null) {
      return false
    }
    value[attribute.name as keyof T] = propertyValue
    return await change(value)
  }
</script>

<div class="antiSection">
  <div class="min-h-4"></div>

  {#each attributes as attribute (attribute._id)}
    <div class="flex-row-top flex-gap-2">
      <div class="w-4 flex-center">—</div>

      <div class="flex-grow flex-col">
        <div class="font-medium">
          <AttributeTitleEditor title={attribute.title} readonly />
        </div>

        <PropertyEditor
          {attribute}
          value={getProperty(attribute)}
          change={change === null ? null : async (propertyValue) => await changeProperty(attribute, propertyValue)}
        />
      </div>
    </div>

    <div class="min-h-4"></div>
  {/each}
</div>
