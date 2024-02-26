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
  import { Component, SelectPopup, showPopup } from '@hcengineering/ui'
  import type { MouseTargetEvent } from '@hcengineering/ui'
  import { NavLink } from '../..'
  import { BreadcrumbsModel } from './types'
  import { hasComponent } from './utils'

  export let models: readonly BreadcrumbsModel[]
  export let disabled: boolean = false

  $: trimmed = models.length > 3
  $: narrowModel = trimmed ? [models[0], models[models.length - 1]] : models

  const handleMenuOpened = (event: MouseTargetEvent) => {
    event.preventDefault()
    const items = models.slice(1, -1).map((m, i) => {
      if (hasComponent(m)) {
        const { component, props } = m
        return { id: i, component, props }
      } else {
        const { title } = m
        return { id: i, text: title }
      }
    })
    showPopup(SelectPopup, { value: items }, event.currentTarget)
  }
</script>

{#each narrowModel as model, i}
  {#if hasComponent(model)}
    {@const { component, props } = model}
    <div class="title">
      {#if typeof component === 'string'}
        <Component is={component} {props} />
      {:else}
        <svelte:component this={component} {...props} />
      {/if}
    </div>
  {:else}
    {@const { title, href, onClick } = model}
    <NavLink {href} noUnderline {onClick} {disabled}>
      <div class="title">{title}</div>
    </NavLink>
  {/if}
  <div class="title disabled">/</div>
  {#if trimmed && i === 0}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="title" on:click={handleMenuOpened}>...</div>
    <div class="title disabled">/</div>
  {/if}
{/each}
