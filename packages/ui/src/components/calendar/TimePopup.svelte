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
  import { createEventDispatcher } from 'svelte'
  import { MILLISECONDS_IN_DAY, DAYS_IN_WEEK } from './internal/DateUtils'

  export let value: number

  const dispatch = createEventDispatcher()

  interface ITimes {
    label: string
    value: number
  }

  const actions: Array<ITimes> = [
    { label: '- week', value: -DAYS_IN_WEEK * MILLISECONDS_IN_DAY },
    { label: '- day', value: -MILLISECONDS_IN_DAY },
    { label: '- hour', value: -60 * 60 * 1000 },
    { label: '- 30 min', value: -30 * 60 * 1000 },
    { label: '- 5 min', value: -5 * 60 * 1000 },
    { label: '+ 5 min', value: 5 * 60 * 1000 },
    { label: '+ 30 min', value: 30 * 60 * 1000 },
    { label: '+ hour', value: 60 * 60 * 1000 },
    { label: '+ day', value: MILLISECONDS_IN_DAY },
    { label: '+ week', value: DAYS_IN_WEEK * MILLISECONDS_IN_DAY }
  ]
</script>

<div class="scrollbox">
  {#each actions as action}
    <button
      class="ap-menuItem no-word-wrap"
      on:click={() => {
        dispatch('update', new Date(value + action.value))
      }}
    >
      {action.label}
    </button>
  {/each}
</div>

<style lang="scss">
  .scrollbox {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
</style>
