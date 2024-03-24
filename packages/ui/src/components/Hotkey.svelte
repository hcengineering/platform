<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import type { AnySvelteComponent } from '../types'
  import Icon from './Icon.svelte'
  import KeyShift from './icons/KeyShift.svelte'
  import KeyOption from './icons/KeyOption.svelte'
  import KeyCommand from './icons/KeyCommand.svelte'

  export let key: string

  const predefinedKeys: Record<string, AnySvelteComponent> = {
    shift: KeyShift,
    option: KeyOption,
    command: KeyCommand
  }

  $: isPredefinedKey = key in predefinedKeys
</script>

<span class="hotkey flex-center min-w-4 h-4 font-regular-11" class:text={!isPredefinedKey}>
  {#if isPredefinedKey}
    <Icon icon={predefinedKeys[key]} size="x-small" />
  {:else}
    {key}
  {/if}
</span>

<style lang="scss">
  .hotkey {
    border-radius: var(--min-BorderRadius);
    background-color: var(--global-ui-hover-BackgroundColor);

    &.text {
      padding: 0 var(--spacing-0_5);
    }
  }
</style>
