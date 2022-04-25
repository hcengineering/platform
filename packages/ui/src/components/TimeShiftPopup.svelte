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
  import { createEventDispatcher } from 'svelte'
  import TimeShiftPresenter from './TimeShiftPresenter.svelte'

  export let direction: 'before' | 'after'
  export let minutes: number[] = [5, 15, 30]
  export let hours: number[] = [1, 2, 4]
  export let days: number[] = [1, 3, 7, 30]
  const dispatch = createEventDispatcher()

  $: base = direction === 'before' ? -1 : 1
  const MINUTE = 60 * 1000
  const HOUR = 60 * MINUTE
  const DAY = 24 * HOUR
  $: values = [...minutes.map((m) => m * MINUTE), ...hours.map((m) => m * HOUR), ...days.map((m) => m * DAY)]

</script>

<div class="antiPopup">
  {#each values as value}
    <div class="ap-menuItem" on:click={() => { dispatch('close', value) }} >
      <TimeShiftPresenter value={value * base}/>
    </div>
  {/each}
</div>