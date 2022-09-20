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
  import type { Class, Doc, DocumentQuery, Enum, Ref } from '@hcengineering/core'
  import { ObjectCreate, ObjectPopup } from '@hcengineering/presentation'

  export let _class: Ref<Class<Enum>>
  export let selected: Ref<Enum> | undefined
  export let query: DocumentQuery<Enum> | undefined
  export let create: ObjectCreate | undefined = undefined

  $: _create =
    create !== undefined
      ? {
          ...create,
          update: (doc: Doc) => (doc as Enum).name
        }
      : undefined
</script>

<ObjectPopup
  {_class}
  {selected}
  bind:docQuery={query}
  multiSelect={false}
  allowDeselect={false}
  shadows={true}
  create={_create}
  on:update
  on:close
>
  <svelte:fragment slot="item" let:item>
    {item.name}
  </svelte:fragment>
</ObjectPopup>
