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
  import { closeTooltip, resizeObserver } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'
  import TimestampPresenter from '../TimestampPresenter.svelte'

  export let filter: Filter
  export let onChange: (e: Filter) => void

  const dispatch = createEventDispatcher()

  filter.modes = [view.filter.FilterBefore, view.filter.FilterAfter]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  function click (value: number): void {
    closeTooltip()
    filter.value = [value]
    onChange(filter)
    dispatch('close')
  }

  const today = new Date().setHours(0, 0, 0, 0)
  function shiftDays (diff: number): number {
    return new Date(today).setDate(new Date(today).getDate() - diff)
  }

  const values = [
    shiftDays(1),
    shiftDays(2),
    shiftDays(3),
    shiftDays(7),
    shiftDays(14),
    shiftDays(21),
    shiftDays(30),
    shiftDays(90),
    shiftDays(180),
    shiftDays(365)
  ]
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="scroll">
    <div class="box">
      {#each values as value, i}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="menu-item"
          on:click={() => {
            click(value)
          }}
        >
          <TimestampPresenter {value} />
        </div>
      {/each}
    </div>
  </div>
</div>
