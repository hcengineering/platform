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
  import type { Document } from '@hcengineering/document'
  import { Icon, IconWithEmoji, getPlatformColorDef, themeStore } from '@hcengineering/ui'
  import document from '@hcengineering/document'
  import view from '@hcengineering/view'
  import ToDoReference from '../ToDoReference.svelte'

  export let value: Document
  export let inline: boolean = false
  export let disabled: boolean = false
  export let withoutSpace: boolean = true

  $: icon = value.icon === view.ids.IconWithEmoji ? IconWithEmoji : value.icon ?? document.icon.Document
  $: iconProps =
    value.icon === view.ids.IconWithEmoji
      ? { icon: value.color }
      : {
          fill: value.color !== undefined ? getPlatformColorDef(value.color, $themeStore.dark).icon : 'currentColor'
        }
</script>

<ToDoReference label={value.name} on:click>
  <svelte:fragment slot="icon">
    <Icon size="small" {icon} {iconProps} />
  </svelte:fragment>
  <slot />
</ToDoReference>
