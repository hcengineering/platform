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
  import { DashboardItem } from '../types'
  import MultiProgress from './MultiProgress.svelte'

  export let items: DashboardItem[] = []

  $: max = Math.max(...items.map((p) => p.values.reduce((acc, val) => (acc += val.value), 0)))
</script>

<div class="grid">
  {#each items as item (item._id)}
    <div>
      {item.label}
    </div>
    <div class="w-full max-w-240">
      <MultiProgress {max} values={item.values} />
    </div>
  {/each}
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-auto-flow: column;
    justify-content: flex-start;
    align-items: center;
    row-gap: 1rem;
    column-gap: 1rem;

    grid-template-columns: 1fr 5fr;
    grid-auto-flow: row;
  }
</style>
