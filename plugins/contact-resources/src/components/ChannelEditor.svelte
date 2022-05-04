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
  import { createEventDispatcher, onMount } from 'svelte'
  import type { IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import { Button, Icon, IconClose, IconBlueCheck, IconArrowRight } from '@anticrm/ui'

  export let value: string = ''
  export let placeholder: IntlString

  const dispatch = createEventDispatcher()
  let input: HTMLInputElement
  let phTraslate: string
  translate(placeholder, {}).then((tr) => (phTraslate = tr))

  onMount(() => {
    if (input) input.focus()
  })
</script>

<div class="selectPopup relative">
  <div class="header no-border">
    <div class="flex-between flex-grow pr-2">
      <div class="flex-grow">
        <input
          bind:this={input}
          type="text"
          bind:value
          placeholder={phTraslate}
          style="width: 100%;"
          on:keypress={(ev) => {
            if (ev.key === 'Enter') dispatch('close', value)
          }}
          on:keydown={(ev) => {
            if (ev.key === 'ArrowLeft' && ev.altKey) dispatch('update', 'left')
            if (ev.key === 'ArrowRight' && ev.altKey) dispatch('update', 'right')
          }}
          on:change
        />
      </div>
      <div class="buttons-group small-gap">
        <div
          class="clear-btn show"
          on:click={() => {
            dispatch('close', value)
          }}
        >
          <div class="icon"><Icon icon={IconClose} size={'inline'} /></div>
        </div>
        <Button kind={'transparent'} size={'small'} icon={IconArrowRight} on:click={() => dispatch('update', 'open')} />
        <Button kind={'transparent'} size={'small'} icon={IconBlueCheck} on:click={() => dispatch('close', value)} />
      </div>
    </div>
  </div>
</div>
