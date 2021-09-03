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

  // import Close from './internal/icons/Close.svelte'
  // import ScrollBox from './ScrollBox.svelte'
  import Button from './Button.svelte'
  import Label from './Label.svelte'

  export let label: IntlString
  export let okLabel: IntlString
  export let okAction: () => void

  const dispatch = createEventDispatcher()
</script>

<form class="card-container" on:submit|preventDefault={() => { okAction(); dispatch('close') }}>
  <div class="card-bg" />
  <div class="flex-between header">
    <div class="overflow-label label"><Label {label} /></div>
    <div class="tool"><Button label={okLabel} size={'small'} transparent on:click={() => { dispatch('close') }} /></div>
  </div>
  <div class="content"><slot /></div>
</form>

<style lang="scss">
  .card-container {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0;
    background-color: transparent;
    border-radius: 1.25rem;

    .header {
      flex-shrink: 0;
      padding: 1rem 1.25rem 1rem 1.75rem;

      .label {
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
      }
      .tool { margin-left: .75rem; }
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      margin: 0 1.75rem 1.75rem;
      height: fit-content;
    }

    .card-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: 1.25rem;
      z-index: -1;
    }
  }
</style>