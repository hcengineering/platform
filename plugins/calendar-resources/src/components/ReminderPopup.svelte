<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { DAY, HOUR, MINUTE, TimeShiftPresenter } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let value: number

  export function canClose () {
    return true
  }

  const minutes: number[] = [5, 10, 15, 30]
  const hours: number[] = [1]
  const days: number[] = [1]

  $: values = [...minutes.map((m) => m * MINUTE), ...hours.map((m) => m * HOUR), ...days.map((m) => m * DAY)]

  const dispatch = createEventDispatcher()
</script>

<div class="antiPopup">
  {#each values as val}
    <div
      class="ap-menuItem flex-row-center hoverable"
      class:selected={value === val}
      on:click={() => {
        dispatch('close', val)
      }}
    >
      <TimeShiftPresenter value={val * -1} />
    </div>
  {/each}
</div>
