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
  import Calendar from './icons/Calendar.svelte'
  import Close from './icons/Close.svelte'
  import { DatePopup, showPopup } from '..'

  export let title: IntlString
  export let selected: Date = new Date(Date.now())
  export let show: boolean = false
  let container: HTMLElement

</script>

<div class="flex-row-center">
  <button
    bind:this={container}
    class="focused-button btn"
    class:selected={show}
    on:click|preventDefault={() => {
      show = true
      showPopup(DatePopup, { selected, title }, container, (result) => {
        if (result) {
          selected = result
        }
        show = false
      })
    }}
  >
    <div class="icon">
      {#if show}<Close size={'small'} />{:else}<Calendar size={'medium'} />{/if}
    </div>
  </button>

  <div class="selectDate">
    <div class="label"><Label label={title} /></div>
    <div class="date">
      {selected.getMonth() + 1} / {selected.getDate()} / {selected.getFullYear()}
    </div>
  </div>
</div>

<style lang="scss">
  .btn {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: .5rem;
    border: none;
  }

  .selectDate {
    margin-left: .75rem;
    .label {
      font-size: .75rem;
      font-weight: 500;
      color: var(--theme-content-accent-color);
    }
    .date {
      color: var(--theme-caption-color);
    }
  }
</style>
