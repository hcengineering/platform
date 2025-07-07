<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import {
    getPlatformColorDef,
    themeStore,
    tooltip,
    ColorDefinition,
    Label,
    IconClose,
    ButtonIcon
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let labelIntl: IntlString | undefined = undefined
  export let label: string | undefined = undefined
  export let color: number | undefined = undefined
  export let removable: boolean = false

  const dispatch = createEventDispatcher()

  function getTagStyle (color: ColorDefinition): string {
    return `
    background: ${color.color + '33'};
    border: 1px solid ${color.color + '66'};
    color: ${color.title ?? 'var(--theme-caption-color)'};
  `
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="tag"
  class:removable
  style={`${getTagStyle(getPlatformColorDef(color ?? 0, $themeStore.dark))}`}
  on:click
  on:keydown
  use:tooltip={{
    label: labelIntl ?? getEmbeddedLabel(label ?? '')
  }}
>
  <span class="overflow-label max-w-40">
    {#if labelIntl}
      <Label label={labelIntl} />
    {:else if label}
      {label}
    {/if}
  </span>

  {#if removable}
    <ButtonIcon icon={IconClose} size="min" iconSize="x-small" kind="tertiary" on:click={() => dispatch('remove')} />
  {/if}
</div>

<style lang="scss">
  .tag {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 0.5rem;
    min-width: 2rem;
    max-width: 10rem;
    min-height: 1.5rem;
    font-size: 0.688rem;
    font-weight: 500;
    border-radius: 1rem;
    white-space: nowrap;
    gap: 0.25rem;

    &.removable {
      min-width: 3.25rem;
      padding-right: 0.25rem;
    }
  }
</style>
