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
  import Label from '../Label.svelte'
  import { IWizardStep } from '../../types'
  import Checkmark from '../icons/Checkmark.svelte'

  export let steps: ReadonlyArray<IWizardStep>
  export let selectedStep: string

  $: selectedIdx = selectedStep !== '' ? steps.findIndex((s) => s.id === selectedStep) : -1
</script>

<div class="root">
  {#each steps as step, idx}
    {@const isCurrent = idx === selectedIdx}
    {@const isPast = idx < selectedIdx}
    {#if idx !== 0}
      <div class="flex-col-center" style:grid-column="1" style:grid-row={3 * idx}>
        <div class="path" class:highlighted={isPast || isCurrent} />
      </div>
    {/if}
    <div
      class="circle"
      class:filled={!isPast && !isCurrent}
      class:filledHighlighted={isPast}
      style:grid-column="1"
      style:grid-row={3 * idx + 1}
    >
      {#if isPast}
        <div class="checkmark flex-center"><Checkmark size="tiny" /></div>
      {/if}
    </div>
    <div class="label" class:highlighted={isCurrent || isPast} style:grid-column="2" style:grid-row={3 * idx + 1}>
      <div class="overflow-label">{idx + 1}. <Label label={step.title} /></div>
    </div>
    {#if idx !== steps.length - 1}
      <div class="flex-col-center" style:grid-column="1" style:grid-row={3 * idx + 2}>
        <div class="path" class:highlighted={isPast || isCurrent} />
      </div>
    {/if}
  {/each}
</div>

<style lang="scss">
  .root {
    display: grid;
    grid-template-columns: 1rem 1fr;
    grid-auto-rows: auto;
    grid-column-gap: 0.5rem;
    width: 100%;
  }

  .circle {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 2px solid var(--positive-button-default);

    &.filledHighlighted {
      background: var(--positive-button-default);
    }

    &.filled {
      border-color: var(--theme-wizard-not-visited-color);
      background: var(--theme-wizard-not-visited-color);
    }
  }

  .path {
    width: 2px;
    height: 0.875rem;
    border: 1px solid var(--theme-wizard-not-visited-color);

    &.highlighted {
      border-color: var(--positive-button-default);
    }
  }

  .label {
    font-size: 0.8125rem;
    line-height: 1rem;
    min-width: 0;

    &.highlighted {
      font-weight: 500;
    }
  }

  .checkmark {
    color: var(--theme-button-contrast-color);
  }
</style>
