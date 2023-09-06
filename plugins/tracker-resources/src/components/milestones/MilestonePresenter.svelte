<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { WithLookup } from '@hcengineering/core'
  import { Milestone } from '@hcengineering/tracker'
  import {
    Icon,
    getPlatformAvatarColorDef,
    getPlatformAvatarColorForTextDef,
    themeStore,
    tooltip
  } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'

  export let value: WithLookup<Milestone> | undefined
  export let shouldShowAvatar = true
  export let disabled = false
  export let inline = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let onClick: (() => void) | undefined = undefined

  const dispatch = createEventDispatcher()
  $: accentColor =
    value?.label !== undefined
      ? getPlatformAvatarColorForTextDef(value?.label, $themeStore.dark)
      : getPlatformAvatarColorDef(0, $themeStore.dark)

  $: dispatch('accent-color', accentColor)
  onMount(() => {
    dispatch('accent-color', accentColor)
  })
</script>

{#if value}
  <DocNavLink object={value} {disabled} {inline} {accent} {noUnderline} {onClick}>
    {#if inline}
      <span class="antiMention" use:tooltip={{ label: tracker.string.Milestone }}>@{value.label}</span>
    {:else}
      <div class="flex-presenter" use:tooltip={{ label: tracker.string.Milestone }}>
        {#if shouldShowAvatar}
          <div class="icon">
            <Icon icon={tracker.icon.Milestone} size="small" />
          </div>
        {/if}
        <span
          title={value.label}
          class="overflow-label label"
          class:no-underline={noUnderline || disabled}
          class:fs-bold={accent}
        >
          {value.label}
        </span>
      </div>
    {/if}
  </DocNavLink>
{/if}
