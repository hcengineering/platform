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
  import { Component } from '@hcengineering/tracker'
  import { Icon, getCurrentResolvedLocation, navigate, tooltip } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let value: WithLookup<Component>
  export let shouldShowAvatar = true
  export let onClick: () => void | undefined
  export let disabled = false
  export let inline: boolean = false

  function navigateToComponent () {
    if (disabled) {
      return
    }
    if (onClick) {
      onClick()
    }

    const loc = getCurrentResolvedLocation()
    loc.path[4] = 'components'
    loc.path[5] = value._id
    loc.path.length = 6
    loc.fragment = undefined
    navigate(loc)
  }
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="flex-presenter" class:inline-presenter={inline} on:click={navigateToComponent}>
    {#if !inline && shouldShowAvatar}
      <div class="icon" use:tooltip={{ label: tracker.string.Component }}>
        <Icon icon={tracker.icon.Component} size={'small'} />
      </div>
    {/if}
    <span title={value.label} class="label nowrap">
      {value.label}
    </span>
  </div>
{/if}
