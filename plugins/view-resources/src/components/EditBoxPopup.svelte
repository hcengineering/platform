<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { Button, EditBox, IconCheck, resizeObserver } from '@hcengineering/ui'
  import type { EditStyle } from '@hcengineering/ui'

  export let value: string | number | undefined
  export let format: 'text' | 'password' | 'number'
  export let placeholder: IntlString
  export let kind: EditStyle = 'editbox'

  const dispatch = createEventDispatcher()

  function _onkeypress (ev: KeyboardEvent) {
    if (ev.key === 'Enter') dispatch('close', value)
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="flex-row-center justify-stretch p-2">
    <div class="overflow-label flex-grow">
      <EditBox bind:value {placeholder} {format} {kind} select on:keypress={_onkeypress} maxWidth={'12rem'} />
    </div>
    <div class="ml-2">
      <Button icon={IconCheck} size={'small'} on:click={() => dispatch('close', value)} />
    </div>
  </div>
</div>
