<!--
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
  import { Component, ScrollerBar, getPlatformColor, themeStore } from '@hcengineering/ui'
  import { NavLink } from '../..'
  import BreadcrumbsElement from './BreadcrumbsElement.svelte'
  import { BreadcrumbsModel } from './types'
  import { hasComponent } from './utils'

  export let models: readonly BreadcrumbsModel[]
  export let gap: 'none' | 'small' | 'big' = 'small'

  let scroller: HTMLElement

  function getPosition (position: number): 'start' | 'end' | 'middle' {
    if (position === 0) {
      return 'start'
    }

    if (position === models.length - 1) {
      return 'end'
    }

    return 'middle'
  }
</script>

<ScrollerBar {gap} bind:scroller>
  {#each models as model, i}
    {@const { color } = model}
    {#if hasComponent(model)}
      {@const { component, props } = model}
      <BreadcrumbsElement
        position={getPosition(i)}
        color={color !== undefined ? getPlatformColor(color, $themeStore.dark) : 'var(--accent-bg-color)'}
      >
        {#if typeof component === 'string'}
          <Component is={component} {props} />
        {:else}
          <svelte:component this={component} {...props} />
        {/if}
      </BreadcrumbsElement>
    {:else}
      {@const { title, href, onClick } = model}
      <NavLink {href} noUnderline {onClick}>
        <BreadcrumbsElement
          label={title}
          {title}
          position={getPosition(i)}
          color={color !== undefined ? getPlatformColor(color, $themeStore.dark) : 'var(--accent-bg-color)'}
        />
      </NavLink>
    {/if}
  {/each}
</ScrollerBar>
