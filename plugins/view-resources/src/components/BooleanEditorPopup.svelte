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
  import { createEventDispatcher } from 'svelte'
  import { CheckBox, resizeObserver } from '@hcengineering/ui'
  import BooleanPresenter from './BooleanPresenter.svelte'

  export let value: boolean | null | undefined
  export let withoutUndefined: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="menu-item" on:click={() => dispatch('close', 1)}>
    <BooleanPresenter value={true} />
    {#if value}
      <div class="check">
        <CheckBox checked kind={'primary'} />
      </div>
    {/if}
  </div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="menu-item" on:click={() => dispatch('close', 2)}>
    <BooleanPresenter value={false} />
    {#if withoutUndefined ? !value : value === false}
      <div class="check">
        <CheckBox checked kind={'primary'} />
      </div>
    {/if}
  </div>
  {#if !withoutUndefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu-item" on:click={() => dispatch('close', 3)}>
      <BooleanPresenter value={undefined} />
      {#if value == null}
        <div class="check">
          <CheckBox checked kind={'primary'} />
        </div>
      {/if}
    </div>
  {/if}
  <div class="menu-space" />
</div>

<style lang="scss">
  .menu-item {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.75rem;
    min-height: 2rem;
    text-align: left;
    color: var(--caption-color);
    cursor: pointer;

    .check {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      pointer-events: none;
    }
    &:focus,
    &:hover {
      background-color: var(--popup-bg-hover);
    }
  }
</style>
