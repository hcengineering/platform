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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import presentation from '..'
  import { ObjectCreate } from '../types'
  import { createQuery } from '../utils'
  import DocPopup from './DocPopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let options: FindOptions<Doc> | undefined = undefined
  export let selected: Ref<Doc> | undefined = undefined

  export let docQuery: DocumentQuery<Doc> | undefined = undefined

  export let multiSelect: boolean = false
  export let closeAfterSelect: boolean = true
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let selectedObjects: Ref<Doc>[] = []
  export let ignoreObjects: Ref<Doc>[] = []
  export let shadows: boolean = true
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let size: 'small' | 'medium' | 'large' = 'small'

  export let searchField: string = 'name'
  export let noSearchField: boolean = false
  export let groupBy = '_class'

  export let create: ObjectCreate | undefined = undefined
  export let readonly = false
  export let disallowDeselect: Ref<Doc>[] | undefined = undefined

  let search: string = ''
  let objects: Doc[] = []

  const query = createQuery()

  $: _idExtra = typeof docQuery?._id === 'object' ? docQuery?._id : {}
  $: query.query<Doc>(
    _class,
    {
      ...(docQuery ?? {}),
      ...(noSearchField
        ? search !== ''
          ? { $search: search }
          : {}
        : { [searchField]: { $like: '%' + search + '%' } }),
      _id: { $nin: ignoreObjects, ..._idExtra }
    },
    (result) => {
      result.sort((a, b) => {
        const aval: string = `${(a as any)[groupBy]}`
        const bval: string = `${(b as any)[groupBy]}`
        return aval.localeCompare(bval)
      })
      objects = result
    },
    { ...(options ?? {}), limit: 200 }
  )
</script>

<DocPopup
  {_class}
  {objects}
  {selected}
  {multiSelect}
  {closeAfterSelect}
  {allowDeselect}
  {titleDeselect}
  {placeholder}
  {selectedObjects}
  {ignoreObjects}
  {shadows}
  {width}
  {size}
  {searchField}
  {noSearchField}
  {groupBy}
  {create}
  {readonly}
  {disallowDeselect}
  on:update
  on:close
  on:changeContent
  on:search={(e) => (search = e.detail)}
>
  <svelte:fragment slot="item" let:item>
    {#if $$slots.item}
      <slot name="item" {item} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="category" let:item>
    {#if $$slots.category}
      <slot name="category" {item} />
    {/if}
  </svelte:fragment>
</DocPopup>
