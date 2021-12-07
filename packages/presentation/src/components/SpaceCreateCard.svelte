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
  import type { IntlString } from '@anticrm/platform'

  import { createEventDispatcher } from 'svelte'
  import { Button, Label } from '@anticrm/ui'

  export let label: IntlString
  export let okAction: () => void
  export let canSave: boolean = false

  const dispatch = createEventDispatcher()
</script>

<form class="card-container" on:submit|preventDefault={ () => {} }>
  <div class="card-bg" />
  <div class="flex-between header">
    <div class="overflow-label label"><Label {label} /></div>
    {#if $$slots.error}
      <div class="flex-grow error">
        <slot name="error" />
      </div>
    {/if}
  </div>
  <div class="content"><slot /></div>
  <div class="footer">
    <Button disabled={!canSave} label={'Create'} size={'small'} transparent primary on:click={() => { okAction(); dispatch('close') }} />
    <Button label={'Cancel'} size={'small'} transparent on:click={() => { dispatch('close') }} />
  </div>
</form>

<style lang="scss">
  .card-container {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 21.25rem;
    min-width: 21.25rem;
    max-width: 21.25rem;
    border-radius: 1.25rem;

    .header {
      position: relative;
      flex-shrink: 0;
      padding: 1.75rem;

      .label {
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
      }

      .error {
        position: absolute;
        display: flex;
        top: 3.25rem;
        left: 1.75rem;
        right: 1.75rem;
        font-weight: 500;
        font-size: .75rem;
        color: var(--system-error-color);
        &:empty { visibility: hidden; }
      }
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      margin: 0 1.75rem .75rem;
      height: fit-content;
    }

    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: start;
      align-items: center;
      column-gap: .75rem;
      padding: 1rem 1.75rem 1.75rem;
      height: 5.25rem;
      overflow: hidden;
      border-radius: 0 0 1.25rem 1.25rem;
    }

    .card-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: 1.25rem;
      backdrop-filter: blur(24px);
      box-shadow: var(--theme-card-shadow);
      z-index: -1;
    }
  }
</style>