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
  import type { Asset, IntlString } from '@anticrm/platform'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import { CircleButton, Label } from '@anticrm/ui'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let label: IntlString
  export let component: AnySvelteComponent
  export let props: any
  export let minimize: boolean = false
</script>

{#if icon}
  <div class="flex-row-center">
    <CircleButton {icon} size={'large'} />
    {#if !minimize}
      <div class="flex-col with-icon">
        <Label {label} />
        <div class="value"><svelte:component this={component} {...props} /></div>
      </div>
    {/if}
  </div>
{:else}
  <div class="flex-col">
    <Label {label} />
    <div class="value"><svelte:component this={component} {...props} /></div>
  </div>
{/if}

<style lang="scss">
  .with-icon {
    margin-left: 0.5rem;
  }
  .value {
    font-weight: 500;
    color: var(--theme-caption-color);
  }
</style>
