<!--
// Copyright © 2023 Anticrm Platform Contributors.
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
  import type { DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import { ObjectPopup } from '@hcengineering/presentation'
  import { Scrum } from '@hcengineering/tracker'
  import ScrumTitle from './ScrumTitle.svelte'
  import tracker from '../../plugin'

  export let selected: Ref<Scrum> | undefined = undefined
  export let query: DocumentQuery<Scrum> = {}
  export let options: FindOptions<Scrum> = {}
</script>

<ObjectPopup
  _class={tracker.class.Scrum}
  {selected}
  bind:docQuery={query}
  {options}
  searchField="title"
  multiSelect={false}
  allowDeselect={false}
  closeAfterSelect
  shadows
  on:update
  on:close
>
  <svelte:fragment slot="item" let:item={scrum}>
    <ScrumTitle value={scrum} />
  </svelte:fragment>
</ObjectPopup>
