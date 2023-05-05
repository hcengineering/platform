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
  import { MessageViewer } from '@hcengineering/presentation'
  import { Button, eventToHTMLElement, Label, showPopup } from '@hcengineering/ui'
  import MarkupEditorPopup from './MarkupEditorPopup.svelte'

  // export let label: IntlString
  export let placeholder: IntlString
  export let value: string
  export let focus: boolean = false
  export let onChange: (value: string) => void
  export let kind: 'no-border' | 'link' = 'no-border'
  export let readonly = false
  // export let size: ButtonSize = 'x-large'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  let shown: boolean = false
</script>

{#if kind === 'link'}
  <Button
    {kind}
    size={'x-large'}
    {justify}
    {width}
    height={value ? 'auto' : undefined}
    on:click={(ev) => {
      if (!shown && !readonly) {
        showPopup(MarkupEditorPopup, { value }, eventToHTMLElement(ev), (res) => {
          if (res != null) {
            value = res
            onChange(value)
          }
          shown = false
        })
      }
    }}
  >
    <svelte:fragment slot="content">
      <div class="lines-limit-4" style:text-align={'left'} class:content-dark-color={readonly}>
        {#if value}
          <MessageViewer message={value} />
        {:else}
          <span class="content-dark-color"><Label label={placeholder} /></span>
        {/if}
      </div>
    </svelte:fragment>
  </Button>
{:else if readonly}
  {#if value}
    <span class="overflow-label">{value}</span>
  {:else}
    <span class="content-dark-color"><Label label={placeholder} /></span>
  {/if}
{/if}
