<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { IntlString } from '@anticrm/platform'
  import Label from './Label.svelte'

  export let label: IntlString | undefined
  export let width: string | undefined
  export let height: string | undefined
  export let value: string | undefined
  export let placeholder: string | undefined
</script>

<div class="textarea" style="{width ? `width: ${width}px;` : ''} {height ? `height: ${height}px;` : ''}">
  {#if label}<div class="label"><Label label={label} /></div>{/if}
  <textarea bind:value {placeholder} />
</div>

<style lang="scss">
  .textarea {
    display: flex;
    flex-direction: column;
    min-width: 50px;
    min-height: 36px;

    .label {
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--theme-caption-color);
      opacity: .8;
      pointer-events: none;
      user-select: none;
    }

    textarea {
      width: auto;
      min-height: 70px;
      margin: -3px;
      padding: 2px;
      font-family: inherit;
      font-size: 14px;
      line-height: 150%;
      color: var(--theme-caption-color);
      background-color: transparent;
      border: 1px solid transparent;
      border-radius: 2px;
      outline: none;
      overflow-y: scroll;
      resize: none;

      &:focus {
        border-color: var(--primary-button-enabled);
      }
      &::placeholder {
        color: var(--theme-content-dark-color);
      }
    }
  }
</style>
