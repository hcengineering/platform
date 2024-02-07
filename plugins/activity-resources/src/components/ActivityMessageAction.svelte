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
  import { ActionIcon, type AnySvelteComponent } from '@hcengineering/ui'
  import { Asset } from '@hcengineering/platform'
  import { ComponentType } from 'svelte'

  export let icon: Asset | AnySvelteComponent | ComponentType
  export let iconProps: any | undefined = undefined
  export let size: 'x-small' | 'small' = 'small'
  export let action: (ev: MouseEvent) => Promise<void> | void = async () => {}
  export let opened = false
</script>

<div class="action" class:opened>
  <ActionIcon {icon} {size} {action} {iconProps} />
</div>

<style lang="scss">
  .action {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0.25rem;

    &:hover {
      color: var(--accent-color);
      background: var(--global-ui-hover-BackgroundColor);
    }

    &.opened {
      color: var(--accent-color);
      background: var(--global-ui-hover-BackgroundColor);
    }
  }
</style>
