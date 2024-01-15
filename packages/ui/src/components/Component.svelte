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
  import { getResource } from '@hcengineering/platform'
  import { deepEqual } from 'fast-equals'
  import { SvelteComponent } from 'svelte'
  import type { AnyComponent } from '../types'
  import ErrorPresenter from './ErrorPresenter.svelte'
  import Loading from './Loading.svelte'
  import ErrorBoundary from './internal/ErrorBoundary'

  // Reference to rendered component instance
  export let innerRef: SvelteComponent | undefined = undefined
  export let is: AnyComponent
  export let props = {}
  export let shrink: boolean = false
  export let showLoading = true
  export let inline: boolean = false
  export let disabled: boolean = false

  let _is: any = is
  let _props: any = props

  $: if (!deepEqual(_is, is)) {
    _is = is
  }
  $: if (!deepEqual(_props, props)) {
    _props = props
  }

  $: component = _is != null ? getResource<any>(_is) : Promise.reject(new Error('is not defined'))
</script>

{#if _is}
  {#await component}
    {#if showLoading}
      <Loading {shrink} />
    {/if}
  {:then Ctor}
    <ErrorBoundary>
      {#if $$slots.default !== undefined}
        <Ctor
          bind:this={innerRef}
          {..._props}
          {inline}
          {disabled}
          on:change
          on:close
          on:open
          on:click
          on:delete
          on:action
          on:valid
          on:validate
          on:submit
        >
          <slot />
        </Ctor>
      {:else}
        <Ctor
          bind:this={innerRef}
          {..._props}
          {inline}
          {disabled}
          on:change
          on:close
          on:open
          on:click
          on:delete
          on:action
          on:valid
          on:validate
          on:submit
        />
      {/if}
    </ErrorBoundary>
  {:catch err}
    <pre style="max-height: 140px; overflow: auto;">
      <ErrorPresenter error={err} />
    </pre>
    <!-- <Icon icon={ui.icon.Error} size="32" /> -->
  {/await}
{/if}
