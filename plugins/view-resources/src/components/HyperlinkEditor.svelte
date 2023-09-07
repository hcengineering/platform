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
  import type { IntlString } from '@hcengineering/platform'
  import type { ButtonSize, ButtonKind } from '@hcengineering/ui'
  import { Label, showPopup, eventToHTMLElement, Button, parseURL } from '@hcengineering/ui'
  import HyperlinkEditorPopup from './HyperlinkEditorPopup.svelte'

  export let placeholder: IntlString
  export let value: string
  export let onChange: (value: string) => void = () => {}
  export let kind: ButtonKind | undefined = undefined
  export let readonly = false
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'
  export let title: string | undefined

  let shown: boolean = false
</script>

<Button
  {kind}
  {size}
  {justify}
  {width}
  on:click={(ev) => {
    if (!shown) {
      showPopup(HyperlinkEditorPopup, { value, editable: !readonly }, eventToHTMLElement(ev), (res) => {
        if (res === 'open') {
          const url = parseURL(value)
          if (url.startsWith('http://') || url.startsWith('https://')) {
            window.open(url)
          }
        } else if (res !== undefined) {
          value = res
          onChange(value)
        }
        shown = false
      })
    }
  }}
>
  <svelte:fragment slot="content">
    {#if title}
      <span class="caption-color overflow-label pointer-events-none">{title}</span>
    {:else if value}
      <span class="caption-color overflow-label pointer-events-none">{value}</span>
    {:else}
      <span class="content-dark-color pointer-events-none">
        <Label label={placeholder} />
      </span>
    {/if}
  </svelte:fragment>
</Button>
