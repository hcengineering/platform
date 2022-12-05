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
  import { EditBox, Label, showPopup, eventToHTMLElement } from '@hcengineering/ui'
  import EditBoxPopup from './EditBoxPopup.svelte'

  // export let label: IntlString
  export let placeholder: IntlString
  export let value: string
  export let focus: boolean
  export let onChange: (value: string) => void
  export let kind: 'no-border' | 'link' = 'no-border'
  export let readonly = false

  let shown: boolean = false

  function _onchange (ev: Event) {
    onChange((ev.target as HTMLInputElement).value)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if kind === 'link'}
  <div
    class="link-container"
    on:click={(ev) => {
      if (!shown && !readonly) {
        showPopup(EditBoxPopup, { value }, eventToHTMLElement(ev), (res) => {
          if (res !== undefined) {
            value = res
            onChange(value)
          }
          shown = false
        })
      }
    }}
  >
    {#if value}
      <span class="overflow-label">{value}</span>
    {:else}
      <span class="dark-color"><Label label={placeholder} /></span>
    {/if}
  </div>
{:else if readonly}
  {#if value}
    <span class="overflow-label">{value}</span>
  {:else}
    <span class="dark-color"><Label label={placeholder} /></span>
  {/if}
{:else}
  <EditBox {placeholder} bind:value {focus} on:change={_onchange} />
{/if}

<style lang="scss">
  .link-container {
    display: flex;
    align-items: center;
    padding: 0 0.875rem;
    width: 100%;
    height: 2rem;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    cursor: pointer;
    color: var(--caption-color);

    &:hover {
      background-color: var(--body-color);
      border-color: var(--divider-color);
    }
  }
</style>
