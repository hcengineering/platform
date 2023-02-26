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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import ui from '../plugin'
  import {
    AnySvelteComponent,
    DialogStep,
    Panel,
    Icon,
    deviceOptionsStore as deviceInfo,
    Scroller,
    Label,
    Button,
    Component
  } from '..'

  export let steps: ReadonlyArray<DialogStep>
  export let stepIndex = 0
  export let doneLabel: IntlString = ui.string.Save
  export let title: IntlString
  export let stepsName: IntlString | undefined = undefined
  export let stepsDescription: IntlString | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let useMaxWidth: boolean | undefined = undefined
  export let panelWidth = 0
  export let innerWidth = 0
  export let allowClose = true
  export let floatAside = false

  const dispatch = createEventDispatcher()

  let currentStep: DialogStep | undefined
  let currentStepIndex = 0
  let isStepValid = false
  let isSaving = false

  async function handleStepSelect (index: number) {
    const newStepIndex = index < steps.length ? Math.max(0, index) : Math.max(0, steps.length - 1)

    if (newStepIndex > currentStepIndex) {
      await completeCurrentStep()
    }

    currentStepIndex = newStepIndex
    isStepValid = false
  }

  function handleComponentChange (ev: CustomEvent<{ isValid?: boolean }>) {
    isStepValid = !!ev.detail.isValid
  }

  async function handleDone () {
    await completeCurrentStep()

    dispatch('close')
  }

  async function completeCurrentStep () {
    if (!currentStep?.onDone) {
      return
    }

    isSaving = true
    try {
      await currentStep.onDone()
    } finally {
      isSaving = false
    }
  }

  $: currentStep = steps[currentStepIndex]
  $: stepIndex = currentStepIndex
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<Panel bind:panelWidth bind:innerWidth bind:useMaxWidth {floatAside} {allowClose} isAside isHeader on:close>
  <svelte:fragment slot="title">
    {@const additionalStepInfo = currentStep?.additionalInfo}

    <div class="popupPanel-title__content-container antiTitle">
      <div class="icon-wrapper">
        {#if icon}<div class="wrapped-icon"><Icon {icon} size="medium" /></div>{/if}
        <div class="title-wrapper">
          {#if title}<span class="wrapped-title"><Label label={title} /></span>{/if}
          {#if additionalStepInfo}<span class="wrapped-subtitle">{additionalStepInfo}</span>{/if}
        </div>
      </div>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="utils">
    {@const isDone = currentStepIndex === steps.length - 1}

    {#if currentStepIndex > 0}
      <Button kind="secondary" label={ui.string.Back} on:click={async () => await handleStepSelect(currentStepIndex - 1)} />
    {/if}
    <Button
      kind="primary"
      label={isDone ? doneLabel : ui.string.Next}
      disabled={!isStepValid}
      loading={isSaving}
      on:click={isDone ? handleDone : async () => await handleStepSelect(currentStepIndex + 1)}
    />
  </svelte:fragment>

  <svelte:fragment slot="header">
    {@const stepName = currentStep?.name}
    {@const stepDescription = currentStep?.description}

    <div class="header header-row between">
      {#if stepName}<h4 class="no-margin"><Label label={stepName} /></h4>{/if}
      {#if stepDescription}
        <div class="buttons-group xsmall-gap" style:align-self="flex-start">
          <span class="lines-limit-2"><Label label={stepDescription} /></span>
        </div>
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="aside">
    <Scroller>
      <div class="default-padding">
        {#if stepsName}<h4 class="no-margin"><Label label={stepsName} /></h4>{/if}
        <ol>
          {#each steps as step, index}
            {@const selected = index === currentStepIndex}
            {@const disabled = index > currentStepIndex && !(index === currentStepIndex + 1 && isStepValid)}
            {@const fulfilled = index < currentStepIndex}

            <li
              class="overflow-label"
              class:selected
              class:disabled
              class:fulfilled
              title={step.name}
              on:click={disabled || selected ? undefined : async () => await handleStepSelect(index)}
            >
              <Label label={step.name} />
            </li>
          {/each}
        </ol>
        {#if stepsDescription}
          <span class="content-trans-color"><Label label={stepsDescription} /></span>
        {/if}
      </div>
    </Scroller>
  </svelte:fragment>

  {#if currentStep?.component}
    {@const { component, props } = currentStep}
    {@const isMobile = $deviceInfo.isMobile}

    <div
      class="clear-mins"
      class:popupPanel-body__mobile-content={isMobile}
      class:popupPanel-body__main-content={!isMobile}
      class:py-8={!isMobile}
      class:max={!isMobile && useMaxWidth}
    >
      {#if typeof component === 'string'}
        <Component is={component} {props} on:change={handleComponentChange} />
      {:else}
        <svelte:component this={component} {...props} on:change={handleComponentChange} />
      {/if}
    </div>
  {/if}
</Panel>

<style lang="scss">
  ol {
    list-style: none;
    counter-reset: item;
    margin: 2rem 0;
  }

  li {
    counter-increment: item;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;
    color: var(--content-color);
    border-radius: 1rem 0.25rem 0.25rem 1rem;
    padding-right: 0.5rem;

    &:not(:last-child) {
      margin-bottom: 0.75rem;
    }

    &:hover {
      background-color: var(--button-bg-hover);
      color: var(--caption-color);
      cursor: pointer;

      &::before {
        color: var(--caption-color);
      }
    }

    &.selected {
      color: var(--theme-content-accent-color);
      background-color: var(--noborder-bg-color);
      cursor: default;

      &::before {
        color: var(--theme-content-accent-color);
        background-color: var(--primary-bg-color);
      }
    }

    &.fulfilled {
      background-color: var(--theme-bg-accent-color);

      &::before {
        background-color: #5e6ad255;
      }
    }

    &.disabled {
      color: var(--theme-content-trans-color);
      cursor: not-allowed;

      &::before {
        color: var(--theme-content-trans-color);
      }

      &:hover {
        background-color: inherit;
        color: none;
      }
    }

    &::before {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin-right: 1rem;
      content: counter(item);
      color: var(--theme-content-color);
      background-color: var(--theme-bg-focused-color);
      border-radius: 100%;
      width: 2rem;
      height: 2rem;
    }
  }

  .header {
    display: flex;
    gap: 0.25rem 1rem;
  }

  .default-padding {
    padding: 0.75rem 1.5rem;
  }

  .no-margin {
    margin: 0;
  }
</style>
