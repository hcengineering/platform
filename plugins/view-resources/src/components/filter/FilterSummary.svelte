<!--
//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
-->
<script lang="ts">
  import type { Filter } from '@hcengineering/view'
  import FilterSection from './FilterSection.svelte'

  /** Filters as stored in `FilteredView.filters` (JSON) or already parsed. */
  export let filters: string | Filter[]

  function parse (value: string | Filter[]): Filter[] {
    if (Array.isArray(value)) return value
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as Filter[]) : []
    } catch {
      return []
    }
  }

  $: list = parse(filters)
</script>

{#if list.length > 0}
  <div class="filter-summary">
    {#each list as filter (filter.index)}
      <FilterSection {filter} space={undefined} readonly />
    {/each}
  </div>
{/if}

<style lang="scss">
  .filter-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
</style>
