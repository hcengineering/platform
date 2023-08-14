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
  import { IntlString } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Button, DropdownLabelsIntl, FocusHandler, Label, createFocusManager } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let label: IntlString = calendar.string.EditRecEvent
  export let currentAvailable: boolean = true

  const dispatch = createEventDispatcher()

  const manager = createFocusManager()

  const items = currentAvailable
    ? [
        {
          id: 'current',
          label: calendar.string.ThisEvent
        },
        {
          id: 'next',
          label: calendar.string.ThisAndNext
        },
        {
          id: 'all',
          label: calendar.string.AllEvents
        }
      ]
    : [
        {
          id: 'next',
          label: calendar.string.ThisAndNext
        },
        {
          id: 'all',
          label: calendar.string.AllEvents
        }
      ]

  let selected = items[0].id
</script>

<FocusHandler {manager} />

<div class="msgbox-container">
  <div class="overflow-label fs-title mb-4"><Label {label} /></div>
  <div>
    <DropdownLabelsIntl {items} bind:selected />
  </div>
  <div class="footer">
    <Button
      focus
      focusIndex={1}
      label={presentation.string.Ok}
      size={'large'}
      kind={'accented'}
      on:click={() => {
        dispatch('close', { mode: selected })
      }}
    />
    <Button
      focusIndex={2}
      label={presentation.string.Cancel}
      size={'large'}
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
</div>

<style lang="scss">
  .msgbox-container {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.75rem 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--theme-popup-color);
    border-radius: 0.5rem;
    user-select: none;
    box-shadow: var(--theme-popup-shadow);

    .message {
      margin-bottom: 1.75rem;
      color: var(--theme-content-color);
    }
    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: flex-start;
      align-items: center;
      column-gap: 0.5rem;
    }
  }
</style>
