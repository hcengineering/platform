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
  import { Milestone, MilestoneStatus } from '@hcengineering/tracker'
  import { Icon, Label } from '@hcengineering/ui'
  import { milestoneStatusAssets } from '../../utils'
  import MilestoneTitlePresenter from './MilestoneTitlePresenter.svelte'
  export let _class: Ref<Class<Milestone>>
  export let selected: Ref<Milestone> | undefined = undefined
  export let milestoneQuery: DocumentQuery<Milestone> = {}
  export let create: ObjectCreate | undefined = undefined
  export let allowDeselect = false
  export let closeAfterSelect: boolean = true
  export let shadows = true
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let ignoreMilestones: Milestone[] | undefined = undefined

  $: ignoreObjects = ignoreMilestones?.filter((s) => '_id' in s).map((s) => s._id)
  $: _create =
    create !== undefined
      ? {
          ...create,
          update: (doc: Doc) => (doc as Milestone).label
        }
      : undefined
  const getStatus = (milestone: Milestone): MilestoneStatus => milestone.status
</script>

<ObjectPopup
  {_class}
  {selected}
  {ignoreObjects}
  bind:docQuery={milestoneQuery}
  searchField={'label'}
  multiSelect={false}
  {allowDeselect}
  {closeAfterSelect}
  {shadows}
  {width}
  create={_create}
  on:update
  on:close
  groupBy={'status'}
>
  <svelte:fragment slot="item" let:item={milestone}>
    <MilestoneTitlePresenter value={milestone} />
  </svelte:fragment>

  <svelte:fragment slot="category" let:item={milestone}>
    {@const status = milestoneStatusAssets[getStatus(milestone)]}
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
