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
  import type { AnySvelteComponent } from '@anticrm/ui'
  import Spinner from './Spinner.svelte'
  import Label from './Label.svelte'
  import Icon from './Icon.svelte'

  export let label: IntlString
  export let primary: boolean = false
  export let size: 'small' | 'medium' = 'medium'
  export let icon: Asset | AnySvelteComponent | undefined
  export let disabled: boolean = false
  export let loading: boolean = false
  export let transparent: boolean = false
  export let width: string | undefined = undefined
</script>

<button class="button {size}" class:primary class:transparent disabled={disabled || loading} style={width ? 'width: ' + width : ''} on:click>
  {#if icon && !loading}
    <div class="icon">
      {#if typeof (icon) === 'string'}
        <Icon {icon} size={'small'}/>
      {:else}
        <svelte:component this={icon} size={'small'} />
      {/if}
    </div>
  {/if}
  {#if loading}
    <Spinner />
  {:else}
    <Label {label} />
  {/if}
</button>

<style lang="scss">
  .small { height: 2.5rem; }
  .medium { height: 3rem; }
  .button {
    padding: 0 1.5rem;
    font-weight: 600;
    background-color: var(--theme-button-bg-enabled);
    color: var(--theme-caption-color);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.75rem;

    .icon {
      margin-right: .375rem;
      transform-origin: center center;
      transform: scale(.75);
    }

    &:hover {
      background-color: var(--theme-button-bg-hovered);
      border-color: var(--theme-button-border-hovered);
    }
    &:focus {
      background-color: var(--theme-button-bg-focused);
      border-color: var(--theme-button-border-focused);
    }
    &:active {
      background-color: var(--theme-button-bg-pressed);
      border-color: var(--theme-button-border-pressed);
    }
    &:disabled {
      background-color: var(--theme-button-bg-disabled);
      border-color: var(--theme-button-border-disabled);
      color: rgb(var(--theme-caption-color) / 40%);
      cursor: not-allowed;
    }
  }

  .primary {
    color: var(--primary-button-color);
    background-color: var(--primary-button-enabled);
    border-color: var(--primary-button-border);

    &:hover {
      background-color: var(--primary-button-hovered);
      border-color: var(--primary-button-border);
    }
    &:focus {
      background-color: var(--primary-button-focused);
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
    }
    &:active {
      background-color: var(--primary-button-pressed);
      border-color: var(--primary-button-border);
      box-shadow: none;
    }
    &:disabled {
      background-color: var(--primary-button-disabled);
      border-color: var(--primary-button-border);
      color: rgb(var(--theme-caption-color) / 60%);
      cursor: not-allowed;
    }
  }

  .transparent {
    padding: 0 1.25rem;
    font-weight: 500;
    border-radius: .5rem;
    color: var(--trans-button-color);
    background-color: var(--trans-button-bg);
    border-color: var(--trans-button-border);

    &:hover {
      background-color: var(--trans-button-bg-hovered);
      border-color: var(--trans-button-border-hovered);
      box-shadow: 0 0 1rem rgba(0, 0, 0, .3);
    }
    &:focus {
      background-color: var(--trans-button-bg-hovered);
      border-color: var(--primary-button-focused-border);
      box-shadow: 0 0 1rem rgba(0, 0, 0, .3);
    }
    &:active {
      background-color: var(--trans-button-bg);
      border-color: var(--trans-button-border);
      box-shadow: 0 0 1rem rgba(0, 0, 0, .1);
    }
    &:disabled {
      background-color: var(--trans-button-bg);
      border-color: var(--trans-button-border);
    }

    &.primary {
      color: var(--trans-primary-button-color);
      background-color: var(--trans-primary-button-bg);
      border-color: var(--trans-primary-button-border);
      backdrop-filter: blur(3px);

      &:hover {
        background-color: var(--trans-primary-button-bg-hovered);
        border-color: var(--trans-primary-button-border-hovered);
        box-shadow: 0 0 1rem rgba(0, 0, 0, .3);
      }
      &:focus {
        background-color: var(--trans-primary-button-bg-hovered);
        border-color: var(--primary-button-focused-border);
        box-shadow: 0 0 1rem rgba(0, 0, 0, .3);
      }
      &:active {
        background-color: var(--trans-primary-button-bg);
        border-color: var(--trans-primary-button-border);
        box-shadow: 0 0 1rem rgba(0, 0, 0, .1);
      }
      &:disabled {
        background-color: var(--trans-primary-button-bg);
        border-color: var(--trans-primary-button-border);
      }
    }
  }
</style>
