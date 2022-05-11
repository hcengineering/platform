<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { Button, IconAdd } from '@anticrm/ui'

  import FilterSummarySection from './FilterSummarySection.svelte'

  export let filters: { [p: string]: any[] } = {}
  export let onDeleteFilter: (filterKey?: string) => void
</script>

<div class="root">
  {#each Object.entries(filters) as [key, value]}
    <FilterSummarySection type={key} selectedFilters={value} onDelete={() => onDeleteFilter(key)} />
  {/each}
  <div class="ml-2">
    <Button kind={'link'} icon={IconAdd} />
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    align-items: center;
  }
</style>
