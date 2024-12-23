<!--
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
-->
<script lang="ts">
  import type { Class, Doc, DocumentQuery, FindOptions, Ref, WithLookup } from '@hcengineering/core'
  import { type Resource } from '@hcengineering/drive'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import { BuildModelKey, ViewOptions } from '@hcengineering/view'
  import { ListSelectionProvider, SelectDirection, buildConfigLookup, focusStore } from '@hcengineering/view-resources'
  import GridItem from './GridItem.svelte'

  export let _class: Ref<Class<Resource>>
  export let query: DocumentQuery<Resource>
  export let config: Array<BuildModelKey | string>
  export let options: FindOptions<Resource> | undefined = undefined
  export let viewOptions: ViewOptions

  const q = createQuery()

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      let pos = objects.findIndex((p) => p._id === of?._id)
      pos += offset
      if (pos < 0) {
        pos = 0
      }
      if (pos >= objects.length) {
        pos = objects.length - 1
      }
      listProvider.updateFocus(objects[pos])
    }
  })

  let objects: WithLookup<Resource>[] = []

  $: orderBy = viewOptions.orderBy
  $: lookup = buildConfigLookup(getClient().getHierarchy(), _class, config, options?.lookup)

  $: q.query(
    _class,
    query,
    (result) => {
      objects = result
    },
    {
      ...options,
      sort: {
        ...(options != null ? options.sort : {}),
        ...(orderBy != null ? { [orderBy[0]]: orderBy[1] } : {})
      },
      lookup
    }
  )

  $: listProvider.update(objects)
  $: selection = listProvider.current($focusStore)
</script>

<ActionContext context={{ mode: 'browser' }} />

<div class="grid-container">
  {#each objects as object, i}
    {@const selected = selection === i}
    <div class="grid-cell">
      <GridItem
        {object}
        {selected}
        on:obj-focus={(evt) => {
          listProvider.updateFocus(evt.detail)
        }}
      />
    </div>
  {/each}
</div>

<style lang="scss">
  .grid-container {
    display: grid;
    margin: 0.5rem 1rem;
    padding-bottom: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
  }
</style>
