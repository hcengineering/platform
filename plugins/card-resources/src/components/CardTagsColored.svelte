<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { Class, ClassifierKind, Doc, Mixin, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Card, MasterTag, Tag } from '@hcengineering/card'
  import { onMount, onDestroy } from 'svelte'
  import { tooltip } from '@hcengineering/ui'
  import CardTagColored from './CardTagColored.svelte'
  import TagsPopup from './TagsPopup.svelte'

  export let value: Card
  export let showTags: boolean = true
  export let showType: boolean = true
  export let collapsable: boolean = false
  export let fullWidth: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let tags: Array<Tag> = []
  let containerRef: HTMLDivElement
  let visibleTags: Array<Tag> = []
  let hiddenTagsCount = 0
  let resizeObserver: ResizeObserver | undefined

  $: {
    const parentClass: Ref<Class<Doc>> = hierarchy.getParentClass(value._class)

    tags = hierarchy
      .getDescendants(parentClass)
      .filter((m) => hierarchy.getClass(m).kind === ClassifierKind.MIXIN && hierarchy.hasMixin(value, m))
      .map((m) => hierarchy.getClass(m) as Mixin<Doc>)
  }

  $: type = hierarchy.getClass(value._class) as MasterTag

  function updateVisibleTags (): void {
    if (!collapsable || containerRef == null || tags.length === 0) {
      visibleTags = tags
      hiddenTagsCount = 0
      return
    }

    const containerWidth = containerRef.clientWidth
    let currentWidth = 0
    let visible = 0

    const tagWidth = 60 // Fixed width for each tag
    const dividerWidth = 20 // Fixed width for divider
    const indicatorWidth = 50 // Fixed width for "+N" indicator

    if (showType) {
      currentWidth += tagWidth
      if (showTags && tags.length > 0) {
        currentWidth += dividerWidth
      }
    }

    // Check how many tags fit
    for (let i = 0; i < tags.length; i++) {
      if (currentWidth + tagWidth > containerWidth) {
        break
      }

      currentWidth += tagWidth
      visible++

      if (i === tags.length - 1) {
        break
      }

      if (currentWidth + tagWidth + indicatorWidth > containerWidth) {
        break
      }
    }

    visibleTags = tags.slice(0, visible)
    hiddenTagsCount = tags.length - visible
  }
  function setupResizeObserver (): void {
    if (!collapsable) {
      return
    }
    if (typeof ResizeObserver !== 'undefined' && containerRef != null) {
      resizeObserver = new ResizeObserver(() => {
        updateVisibleTags()
      })
      resizeObserver.observe(containerRef)
    }
  }

  onMount(() => {
    setupResizeObserver()
    setTimeout(updateVisibleTags, 0)
  })

  onDestroy(() => {
    if (resizeObserver != null) {
      resizeObserver.disconnect()
    }
  })

  $: if (tags != null && containerRef != null) {
    setTimeout(updateVisibleTags, 0)
  }
</script>

<div class="tags-container" class:w-full={fullWidth} bind:this={containerRef}>
  {#if showType}
    <CardTagColored labelIntl={type.label} color={type.background} />
  {/if}
  {#if visibleTags.length > 0 && showTags}
    {#if showType}
      <div class="divider" />
    {/if}
    {#each visibleTags as tag}
      <CardTagColored labelIntl={tag.label} color={tag.background} />
    {/each}
  {/if}
  {#if hiddenTagsCount > 0 && showTags}
    <div class="more-tags" use:tooltip={{ component: TagsPopup, props: { tags: tags.slice(visibleTags.length) } }}>
      <span class="text-11px content-halfcontent-color">
        +{hiddenTagsCount}
      </span>
    </div>
  {/if}
</div>

<style lang="scss">
  .tags-container {
    display: flex;
    overflow: hidden;
    align-items: center;
    gap: 0.25rem;
  }

  .divider {
    border: 1px solid var(--theme-content-color);
    width: 1px;
    height: 0.125rem;
    margin: 0 0.125rem;
  }

  .more-tags {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 0.5rem;
    min-width: 2rem;
    max-width: 10rem;
    min-height: 1.5rem;
    font-size: 0.688rem;
    font-weight: 500;
    border-radius: 1rem;
    white-space: nowrap;
    gap: 0.25rem;
    border: 1px solid var(--theme-divider-color);
    background-color: var(--theme-button-default);
    flex-shrink: 0;

    &:hover {
      background-color: var(--theme-button-hovered);
    }
  }
</style>
