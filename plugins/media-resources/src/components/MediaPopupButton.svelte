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
  import { type Asset, type IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon, IconRight, Label } from '@hcengineering/ui'
  import { ComponentType } from 'svelte'

  import media from '../plugin'

  export let label: IntlString
  export let disabled: boolean
  export let submenu: boolean = false
  export let icon: Asset | AnySvelteComponent | ComponentType
  export let status: 'on' | 'off' | undefined = undefined
</script>

<button class="ap-menuItem withIcon noMargin flex-row-center flex-grow" {disabled} on:click>
  <div class="flex-between flex-grow flex-gap-2">
    <div class="flex-row-center flex-gap-2">
      <div class="icon">
        <Icon {icon} size={'small'} />
      </div>
      <span class="flex-col">
        <div class="label overflow-label font-medium">
          <Label {label} />
        </div>
        {#if status !== undefined}
          <div class="status label overflow-label font-medium" class:on={status === 'on'} class:off={status === 'off'}>
            <Label label={status === 'on' ? media.string.On : media.string.Off} />
          </div>
        {/if}
      </span>
    </div>

    {#if submenu}
      <div class="icon">
        <IconRight size={'tiny'} />
      </div>
    {/if}
  </div>
</button>

<style lang="scss">
  button {
    height: 2.25rem;

    .status {
      &.on {
        color: var(--theme-state-positive-color);
      }
      &.off {
        color: var(--theme-state-negative-color);
      }
    }
  }
</style>
