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
  import { Button, showPopup, eventToHTMLElement } from '@hcengineering/ui'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import BooleanPresenter from './BooleanPresenter.svelte'
  import BooleanEditorPopup from './BooleanEditorPopup.svelte'

  export let value: any
  export let withoutUndefined: boolean = false
  export let onChange: (value: any) => void
  export let disabled: boolean = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  let shown: boolean = false
</script>

<Button
  {kind}
  {size}
  {justify}
  {width}
  {disabled}
  on:click={(ev) => {
    if (!shown && !disabled) {
      showPopup(BooleanEditorPopup, { value, withoutUndefined }, eventToHTMLElement(ev), (res) => {
        if (res !== undefined) {
          if (res === 1) value = true
          else if (res === 2) value = false
          else if (res === 3) value = undefined
          onChange(value)
        }
        shown = false
      })
    }
  }}
>
  <svelte:fragment slot="content">
    <div class="pointer-events-none"><BooleanPresenter bind:value /></div>
  </svelte:fragment>
</Button>
