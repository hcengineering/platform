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
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import {
    AttributeBarEditor,
    KeyedAttribute,
    createQuery,
    getClient,
    getFiltredKeys,
    isCollectionAttr
  } from '@hcengineering/presentation'

  export let object: Doc | Record<string, any>
  export let _class: Ref<Class<Doc>>
  export let to: Ref<Class<Doc>> | undefined = core.class.Doc
  export let ignoreKeys: string[] = []
  export let readonly = false
  export let showHeader: boolean = true
  export let fourRows: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let keys: KeyedAttribute[] = []

  function updateKeys (_class: Ref<Class<Doc>>, ignoreKeys: string[], to: Ref<Class<Doc>> | undefined): void {
    const filtredKeys = getFiltredKeys(hierarchy, _class, ignoreKeys, to)
    keys = filtredKeys.filter((key) => !isCollectionAttr(hierarchy, key))
  }

  $: updateKeys(_class, ignoreKeys, to)

  const query = createQuery()
  $: query.query(core.class.Attribute, { attributeOf: _class }, () => {
    updateKeys(_class, ignoreKeys, to)
  })
</script>

<div class="grid" class:fourRows>
  {#each keys as key (typeof key === 'string' ? key : key.key)}
    <AttributeBarEditor {key} {_class} {object} {showHeader} {readonly} withIcon on:update />
  {/each}
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    -moz-column-gap: 1rem;
    column-gap: 1rem;

    &.fourRows {
      grid-template-columns: 1fr 1.5fr 1fr 1.5fr;
    }
  }
</style>
