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
  import Icon from './Icon.svelte'

  export let label: IntlString
  export let href: string
  export let icon: Asset | AnySvelteComponent | undefined
</script>

<span class="container" on:click>
  {#if icon}
    <span class="icon">
      {#if typeof (icon) === 'string'}
        <Icon {icon} size={'small'}/>
      {:else}
        <svelte:component this={icon} size={'small'} />
      {/if}
    </span>
  {/if}
  <a {href}>{label}</a>
</span>

<style lang="scss">
  .container {
    display: inline-flex;
    align-items: center;
    line-height: 100%;

    .icon {
      margin-right: .25rem;
      transform-origin: center center;
      transform: scale(.75);
      opacity: .6;
    }
    &:hover .icon { opacity: 1; }
    &:active .icon { opacity: .6; }
  }
</style>
