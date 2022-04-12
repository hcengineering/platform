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
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '../types'
  import Spinner from './Spinner.svelte'
  import Label from './Label.svelte'
  import Icon from './Icon.svelte'
  import { onMount } from 'svelte'

  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let kind: 'primary' | 'secondary' | 'no-border' | 'transparent' | 'link' | 'dangerous' = 'secondary'
  export let size: 'small' | 'medium' | 'large' | 'x-large' = 'medium'
  export let shape: 'circle' | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let justify: 'left' | 'center' = 'center'
  export let disabled: boolean = false
  export let loading: boolean = false
  export let width: string | undefined = undefined
  export let resetIconSize: boolean = false
  export let focus: boolean = false
  export let title: string | undefined = undefined

  export let input: HTMLButtonElement | undefined = undefined
  
  $: iconOnly = label === undefined && $$slots.content === undefined

  onMount(() => {
    if (focus && input) {
      input.focus()
      focus = false
    }
  })
</script>

<button
  bind:this={input}
  class="button {kind} {size} jf-{justify}"
  class:only-icon={iconOnly}
  class:border-radius-1={shape !== 'circle'}
  class:border-radius-4={shape === 'circle'}
  disabled={disabled || loading}
  style={width ? 'width: ' + width : ''}
  {title}
  on:click
>
  {#if icon && !loading}
    <div class="btn-icon"
      class:mr-1={!iconOnly && kind === 'no-border'}
      class:mr-2={!iconOnly && kind !== 'no-border'}
      class:resetIconSize
    >
      <Icon {icon} size={'small'}/>
    </div>
  {/if}
  {#if loading}
    <Spinner />
  {:else}
    {#if label}
      <Label {label} params={labelParams}/>
    {:else if $$slots.content}
      <slot name="content" />
    {/if}
  {/if}
</button>

<style lang="scss">
  .small {
    height: 1.5rem;
    line-height: 1.5rem;
    &.only-icon { width: 1.5rem; }
  }
  .medium {
    height: 1.75rem;
    &.only-icon { width: 1.75rem; }
  }
  .large {
    height: 2rem;
    &.only-icon { width: 2rem; }
  }
  .x-large {
    height: 2.75rem;
    &.only-icon { width: 2.75rem; }
  }

  .button {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 .5rem;
    font-weight: 500;
    min-width: 1.5rem;
    white-space: nowrap;
    color: var(--accent-color);
    background-color: transparent;
    border: 1px solid transparent;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: .15s;

    .btn-icon {
      color: var(--content-color);
      transition: color .15s;
      pointer-events: none;
    }
    &:hover {
      color: var(--accent-color);
      transition-duration: 0;
      
      .btn-icon { color: var(--caption-color); }
    }
    &:disabled {
      color: rgb(var(--accent-color) / 40%);
      cursor: not-allowed;
    }

    &.jf-left { justify-content: flex-start; }
    &.jf-center { justify-content: center; }
    &.only-icon { padding: 0; }

    &.secondary {
      background-color: var(--button-bg-color);
      border-color: var(--button-border-color);
      box-shadow: var(--button-shadow);

      &:hover {
        background-color: var(--button-bg-hover);
        border-color: var(--button-border-hover);
      }
      &:disabled {
        background-color: #30323655;
        border-color: #3c3f4455;
      }
    }
    &.no-border {
      font-weight: 400;
      color: var(--accent-color);
      background-color: var(--button-bg-color);
      box-shadow: var(--button-shadow);

      &:hover {
        color: var(--caption-color);
        background-color: var(--button-bg-hover);

        .btn-icon { color: var(--caption-color); }
      }
      &:disabled {
        color: var(--content-color);
        background-color: #30323655;
        cursor: default;
        &:hover {
          color: var(--content-color);
          .btn-icon { color: var(--content-color); }
        }
      }
    }
    &.transparent:hover { background-color: var(--button-bg-hover); }
    &.link {
      padding: 0 .875rem;
      &:hover {
        color: var(--caption-color);
        background-color: var(--body-color);
        border-color: var(--divider-color);
        .btn-icon { color: var(--content-color); }
      }
    }
    &.primary {
      padding: 0 1rem;
      color: var(--white-color);
      background-color: var(--primary-bg-color);
      border-color: var(--primary-bg-color);
      box-shadow: var(--primary-shadow);

      .btn-icon { color: var(--caption-color); }
      &:hover { background-color: var(--primary-bg-hover); }
      &:disabled {
        background-color: #5e6ad255;
        border-color: #5e6ad255;
      }
    }

    &.dangerous {
      color: var(--white-color);
      background-color: var(--dangerous-bg-color);
      border-color: var(--dangerous-bg-color);

      &:hover { background-color: var(--dangerous-bg-hover); }
      &:focus { box-shadow: var(--dangerous-shadow); }
    }

    .resetIconSize { font-size: 16px; }
  }
</style>
