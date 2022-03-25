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

  export let value: number
  export let direction: 'before' | 'after'
  const dispatch = createEventDispatcher()

  $: base = direction === 'before' ? -1 : 1
  $: minutes = 60 * 1000 * base
  $: hours = 60 * minutes
  $: days = 24 * hours
  $: values = [5 * minutes, 15 * minutes, 30 * minutes, 1 * hours, 2 * hours, 4 * hours, 1 * days, 3 * days, 7 * days, 30 * days]

</script>

<div class="antiPopup">
  {#each values as value}
    <div class="ap-menuItem">
      <TimeShiftPresenter {value} on:click={() => { dispatch('close', value) }} />
    </div>
  {/each}
</div>