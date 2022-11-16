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
  import { Timestamp } from '@hcengineering/core'
  import { closeTooltip, Label, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'
  import { TimestampPresenter } from '@hcengineering/view-resources'

  const dispatch = createEventDispatcher()

  function click (value: Timestamp | undefined): void {
    closeTooltip()
    dispatch('close', value)
  }

  const today = new Date().setHours(0, 0, 0, 0)
  function shiftDays (diff: number): number {
    return new Date(today).setDate(new Date(today).getDate() - diff)
  }

  const values = [
    shiftDays(1),
    shiftDays(7),
    shiftDays(14),
    shiftDays(30),
    shiftDays(90),
    shiftDays(180),
    shiftDays(365)
  ]
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="scroll">
    <div class="box">
      <div
        class="menu-item"
        on:click={() => {
          click(undefined)
        }}
      >
        <Label label={task.string.AllTime} />
      </div>
      {#each values as value}
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
