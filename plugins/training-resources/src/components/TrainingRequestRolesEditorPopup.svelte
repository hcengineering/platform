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
  import core, { type DocumentQuery, type FindOptions, type Ref, type Role, SortingOrder } from '@hcengineering/core'
  import presentation, { ObjectPopup } from '@hcengineering/presentation'
  import training from '../plugin'

  export let selected: Array<Ref<Role>>
  export let readonly: boolean = false

  const options: FindOptions<Role> = {
    sort: {
      name: SortingOrder.Ascending
    }
  }

  const baseQuery: DocumentQuery<Role> = {
    attachedTo: training.spaceType.Trainings,
    attachedToClass: core.class.SpaceType
  }
  let docQuery: DocumentQuery<Role> = {
    ...baseQuery
  }
  $: {
    docQuery = {
      ...baseQuery,
      ...(readonly ? { _id: { $in: selected } } : {})
    }
  }
</script>

<ObjectPopup
  _class={core.class.Role}
  {docQuery}
  {options}
  bind:selectedObjects={selected}
  {readonly}
  shadows={true}
  multiSelect={true}
  allowDeselect={true}
  placeholder={presentation.string.Search}
  on:update
  on:close
  on:changeContent
>
  <svelte:fragment slot="item" let:item={role}>
    {role.name}
  </svelte:fragment>
</ObjectPopup>
