<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Class, Doc, Mixin, Ref, getObjectValue } from '@hcengineering/core'
  import { getClient, getFiltredKeys } from '@hcengineering/presentation'
  import { Label, Loading } from '@hcengineering/ui'
  import { buildModel, categorizeFields, getMixins } from '../utils'
  import view from '@hcengineering/view'

  export let object: Doc
  export let keys: string[] | undefined = undefined
  export let ignoreKeys: string[] | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let mixins: Mixin<Doc>[] = []
  let visibleKeys: string[] = []

  function getKeys(objectClass: Ref<Class<Doc>>, objectMixins: Mixin<Doc>[], keysToIgnore: string[]): string[] {
    const filteredKeys = getFiltredKeys(hierarchy, objectClass, keysToIgnore)
    const keyById = new Map(filteredKeys.map((key) => [key.attr._id, key]))

    for (const mixin of objectMixins) {
      const mixinKeys = getFiltredKeys(hierarchy, mixin._id, keysToIgnore)

      for (const key of mixinKeys) {
        keyById.set(key.attr._id, key)
      }
    }

    const filtredKeys = Array.from(keyById.values())
    const { attributes } = categorizeFields(hierarchy, filtredKeys, [], [])

    return attributes.map((it) => it.key.key)
  }

  $: mixins = getMixins(object, new Set(), true)
  $: visibleKeys = keys ?? getKeys(object._class, mixins, ignoreKeys ?? [])
</script>

{#await buildModel({ client, _class: object._class, keys: visibleKeys, ignoreMissing: !keys })}
  <Loading />
{:then model}
  <div class="text-lg font-medium mb-8"><Label label={view.string.Properties}/></div>
  <div class="content">
    {#each model as attribute}
      <Label label={attribute.label} />
      <svelte:component this={attribute.presenter} value={getObjectValue(attribute.key, object)} readonly disabled />
    {/each}
  </div>
{/await}

<style lang="scss">
  .content {
    display: grid;
    grid-template-columns: fit-content(10rem) minmax(10rem, 1fr);
    grid-template-rows: auto;
    grid-gap: 2rem 5rem;
    align-items: center;
    overflow: auto;
    width: max-content;
  }
</style>
