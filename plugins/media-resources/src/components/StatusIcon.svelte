<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import type { Asset } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon, IconSize } from '@hcengineering/ui'
  import { ComponentType } from 'svelte'

  export let icon: Asset | AnySvelteComponent | ComponentType
  export let size: IconSize
  export let status: 'on' | 'off' | undefined = undefined

  $: fill =
    status === 'on'
      ? 'var(--theme-state-positive-color)'
      : status === 'off'
        ? 'var(--theme-state-negative-color)'
        : 'var(--theme-content-color)'
</script>

<div class="icon {status}">
  <Icon {icon} {size} iconProps={{ fill }} />
</div>

<style lang="scss">
  .icon {
    padding: 0.25rem;
    border-radius: 0.25rem;
    background-color: var(--theme-bg-color);

    &.on {
      color: var(--theme-state-positive-color);
      background-color: var(--theme-state-positive-background-color);
    }

    &.off {
      color: var(--theme-state-negative-color);
      background-color: var(--theme-state-negative-background-color);
    }
  }
</style>
