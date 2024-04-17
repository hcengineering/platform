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
  import { type AnySvelteComponent, ButtonIcon, IconSize } from '@hcengineering/ui'
  import { Asset, IntlString } from '@hcengineering/platform'
  import { ComponentType } from 'svelte'

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent | ComponentType
  export let iconProps: any | undefined = undefined
  export let size: IconSize = 'small'
  export let action: (ev: MouseEvent) => Promise<void> | void = async () => {}
  export let opened = false

  function onClick (ev: MouseEvent): void {
    ev.stopPropagation()
    ev.preventDefault()
    void action(ev)
  }
</script>

<ButtonIcon
  {icon}
  {iconProps}
  iconSize={size}
  size="small"
  kind="tertiary"
  pressed={opened}
  on:click={onClick}
  tooltip={{ label }}
/>
