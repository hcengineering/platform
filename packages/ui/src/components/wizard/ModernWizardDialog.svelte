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
  import { createEventDispatcher } from 'svelte'
  import { IntlString } from '@hcengineering/platform'
  import Button from '../Button.svelte'
  import Scroller from '../Scroller.svelte'
  import WizardBar from './ModernWizardBar.svelte'
  import ModernDialog from '../ModernDialog.svelte'
  import { IWizardStep } from '../../types'
  import ui from '../../plugin'
  import ArrowLeft from '../icons/ArrowLeft.svelte'
  import ArrowRight from '../icons/ArrowRight.svelte'

  export let loading: boolean = false
  export let label: IntlString
  export let canSubmit: boolean = true
  export let canProceed: boolean = true
  export let submitLabel: IntlString
  export let steps: ReadonlyArray<IWizardStep>
  export let selectedStep: string

  const dispatch = createEventDispatcher()

  $: selectedIdx = hasSelectedStep() ? steps.findIndex((s) => s.id === selectedStep) : -1
  $: hasBack = selectedIdx > 0
  $: hasNext = selectedIdx < steps.length - 1
  $: hasSubmit = selectedIdx === steps.length - 1

  function hasSelectedStep (): boolean {
    return selectedStep !== undefined && selectedStep !== ''
  }

  function handleBack (): void {
    if (!hasSelectedStep()) {
      return
    }

    const currIdx = steps.findIndex((s) => s.id === selectedStep)
    const newIdx = currIdx > 0 ? currIdx - 1 : 0

    dispatch('stepChanged', steps[newIdx].id)
  }

  function handleNext (): void {
    if (!hasSelectedStep()) {
      return
    }

    const currIdx = steps.findIndex((s) => s.id === selectedStep)
    const newIdx = currIdx < steps.length - 1 ? currIdx + 1 : steps.length - 1

    dispatch('stepChanged', steps[newIdx].id)
  }

  function handleSubmit (): void {
    dispatch('submit')
  }
</script>

<ModernDialog {loading} {label} {canSubmit} noContentPadding={true} scrollableContent={false} on:submit on:close>
  <div class="root">
    <div class="side">
      <Scroller>
        <WizardBar {steps} {selectedStep} />
      </Scroller>
    </div>
    <div class="content">
      <Scroller>
        <div class="contentBody">
          <slot />
        </div>
      </Scroller>
    </div>
  </div>

  <div slot="footerExtra">
    {#if hasBack}
      <Button kind="regular" size="large" label={ui.string.Back} icon={ArrowLeft} on:click={handleBack} {loading} />
    {/if}
  </div>

  <div slot="footerButtons">
    {#if hasSubmit}
      <Button
        kind="positive"
        size="large"
        label={submitLabel}
        disabled={!canSubmit}
        {loading}
        on:click={handleSubmit}
      />
    {/if}
    {#if hasNext}
      <Button
        kind="primary"
        size="large"
        label={ui.string.NextStep}
        iconRight={ArrowRight}
        iconRightProps={{ size: 'small' }}
        {loading}
        disabled={!canProceed}
        on:click={handleNext}
      />
    {/if}
  </div>
</ModernDialog>

<style lang="scss">
  .root {
    color: var(--theme-text-primary-color);
    width: 100%;
    min-height: 0;
    display: flex;
    align-items: stretch;
  }

  .side {
    flex: 0 0 12rem;
    padding: 1.5rem;
    min-width: 0;
  }

  .content {
    flex: 1 1 0;
    min-width: 0;
  }

  .contentBody {
    padding: 1.5rem;
  }
</style>
