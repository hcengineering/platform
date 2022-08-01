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
  import type { Class, Doc, DocumentQuery, Ref } from '@anticrm/core'
  import { ObjectCreate, ObjectPopup } from '@anticrm/presentation'
  import { Sprint } from '@anticrm/tracker'
  import SprintTitlePresenter from './SprintTitlePresenter.svelte'

  export let _class: Ref<Class<Sprint>>
  export let selected: Ref<Sprint> | undefined
  export let sprintQuery: DocumentQuery<Sprint> = {}
  export let create: ObjectCreate | undefined = undefined
  export let allowDeselect = false

  $: _create =
    create !== undefined
      ? {
          ...create,
          update: (doc: Doc) => (doc as Sprint).label
        }
      : undefined
</script>

<ObjectPopup
  {_class}
  {selected}
  bind:docQuery={sprintQuery}
  searchField={'label'}
  multiSelect={false}
  {allowDeselect}
  shadows={true}
  create={_create}
  on:update
  on:close
>
  <svelte:fragment slot="item" let:item={sprint}>
    <SprintTitlePresenter value={sprint} />
  </svelte:fragment>
</ObjectPopup>
