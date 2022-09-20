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
  import type { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { ObjectCreate, ObjectPopup } from '@hcengineering/presentation'
  import { Sprint, SprintStatus } from '@hcengineering/tracker'
  import { Icon, Label } from '@hcengineering/ui'
  import { sprintStatusAssets } from '../../utils'
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
  const getStatus = (sprint: Sprint): SprintStatus => sprint.status
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
  groupBy={'status'}
>
  <svelte:fragment slot="item" let:item={sprint}>
    <SprintTitlePresenter value={sprint} />
  </svelte:fragment>

  <svelte:fragment slot="category" let:item={sprint}>
    {@const status = sprintStatusAssets[getStatus(sprint)]}
    {#if status}
      <div class="flex-row-center p-1">
        <Icon icon={status.icon} size={'small'} />
        <div class="ml-2">
          <Label label={status.label} />
        </div>
      </div>
    {/if}
  </svelte:fragment>
</ObjectPopup>
