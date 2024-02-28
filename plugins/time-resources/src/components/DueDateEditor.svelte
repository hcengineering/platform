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
  import ui, { Button, DatePopup, Icon, Label, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import time from '../plugin'

  export let value: number | null | undefined

  const dispatch = createEventDispatcher()

  let opened: boolean = false
</script>

<Button
  kind={'regular'}
  on:click={(e) => {
    if (!opened) {
      opened = true
      showPopup(
        DatePopup,
        { noShift: true, currentDate: value ? new Date(value) : null, label: ui.string.SetDueDate },
        'top',
        (result) => {
          if (result != null && result.value !== undefined) {
            dispatch('change', result.value)
            value = result.value ? result.value.getTime() : null
          }
          opened = false
        }
      )
    }
  }}
>
  <div slot="content" class="flex-row-center flex-gap-1">
    <Icon icon={time.icon.Target} size="medium" />
    {#if value}
      {new Date(value).toLocaleDateString()}
    {:else}
      <Label label={ui.string.DueDate} />
    {/if}
  </div>
</Button>
