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
  import task from '../plugin'
  import { eventToHTMLElement, Label, showPopup } from '@hcengineering/ui'
  import { TimestampPresenter } from '@hcengineering/view-resources'
  import CreateFilterPopup from './CreateFilterPopup.svelte'

  export let value: Timestamp | undefined
</script>

<button
  class="mb-4 ml-10"
  on:click={(e) => {
    showPopup(CreateFilterPopup, {}, eventToHTMLElement(e), (e) => {
      value = e
    })
  }}
>
  {#if value}
    <TimestampPresenter {value} />
  {:else}
    <Label label={task.string.AllTime} />
  {/if}
</button>

<style lang="scss">
  button {
    display: flex;
    align-items: center;
    width: fit-content;
    margin-right: 1px;
    padding: 0 0.375rem;
    font-size: 0.75rem;
    height: 1.5rem;
    white-space: nowrap;
    color: var(--accent-color);
    background-color: var(--noborder-bg-color);
    border: 1px solid transparent;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;
    border-radius: 0.25rem;

    &:hover {
      color: var(--caption-color);
      background-color: var(--noborder-bg-hover);
    }
  }
</style>
