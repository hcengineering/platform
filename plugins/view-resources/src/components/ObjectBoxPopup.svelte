<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Person } from '@hcengineering/contact'
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import presentation, { ObjectCreate, ObjectPopup } from '@hcengineering/presentation'
  import ObjectPresenter from './ObjectPresenter.svelte'

  export let _class: Ref<Class<Doc>>
  export let options: FindOptions<Doc> = {}
  export let selected: Ref<Doc> | undefined
  export let docQuery: DocumentQuery<Doc> = {}

  export let multiSelect: boolean = false
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let selectedObjects: Ref<Person>[] = []
  export let ignoreObjects: Ref<Person>[] = []
  export let shadows: boolean = true
  export let create: ObjectCreate | undefined = undefined
  export let searchField: string = 'name'
  export let docProps: Record<string, any> = {}
</script>

<ObjectPopup
  {_class}
  {options}
  {selected}
  {searchField}
  {multiSelect}
  {allowDeselect}
  {titleDeselect}
  {placeholder}
  {docQuery}
  groupBy={'_class'}
  bind:selectedObjects
  bind:ignoreObjects
  {shadows}
  {create}
  on:update
  on:close
  on:changeContent
>
  <svelte:fragment slot="item" let:item={doc}>
    <div class="flex flex-grow overflow-label">
      <ObjectPresenter
        objectId={doc._id}
        _class={doc._class}
        value={doc}
        props={{ ...docProps, disabled: true, noUnderline: true, size: 'x-small' }}
      />
    </div>
  </svelte:fragment>
</ObjectPopup>
