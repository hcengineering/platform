<!--
// Copyright © 2020 Anticrm Platform Contributors.
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Space } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import {
    AnySvelteComponent,
    Icon,
    IconFolder,
    IconSize,
    IconWithEmoji,
    Label,
    getPlatformColorDef,
    themeStore
  } from '@hcengineering/ui'
  import view, { IconProps } from '@hcengineering/view'

  import presentation from '..'
  import { ComponentType } from 'svelte'

  export let value: Space & IconProps
  export let subtitle: string | undefined = undefined
  export let size: IconSize
  export let iconWithEmoji: AnySvelteComponent | Asset | ComponentType | undefined = view.ids.IconWithEmoji
  export let defaultIcon: AnySvelteComponent | Asset | ComponentType | undefined = undefined
</script>

<div class="flex-presenter">
  <div class="icon medium-gap">
    <Icon
      {size}
      icon={value.icon === iconWithEmoji && iconWithEmoji ? IconWithEmoji : value.icon ?? defaultIcon ?? IconFolder}
      iconProps={value.icon === iconWithEmoji && iconWithEmoji
        ? { icon: value.color }
        : {
            fill: value.color !== undefined ? getPlatformColorDef(value.color, $themeStore.dark).icon : 'currentColor'
          }}
    />
  </div>
  <div class="flex-col">
    {#if subtitle}<div class="content-dark-color text-sm">{subtitle}</div>{/if}
    <div class="label no-underline nowrap">
      {value.name}
      {#if value.archived}
        <Label label={presentation.string.Archived} />
      {/if}
    </div>
  </div>
</div>
