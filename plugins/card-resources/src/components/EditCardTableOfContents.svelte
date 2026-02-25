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
  import card, { Card, CardSection, CardViewDefaults } from '@hcengineering/card'
  import communication from '@hcengineering/communication'
  import { NotificationContext } from '@hcengineering/communication-types'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Heading } from '@hcengineering/text-editor'
  import { TableOfContents } from '@hcengineering/text-editor-resources'
  import { Component, Loading, ModernButton, Scroller } from '@hcengineering/ui'
  import { SvelteComponent, tick } from 'svelte'

  import { getMetadata } from '@hcengineering/platform'
  import { getCardSections, getCardToc } from '../card'
  import { CardSectionAction } from '../types'

  export let doc: Card
  export let context: NotificationContext | undefined = undefined
  export let isContextLoaded: boolean = false
  export let readonly: boolean = false
  export let scrollDiv: HTMLDivElement | undefined | null = undefined

  const messagesId = communication.ids.CardMessagesSection
  const client = getClient()

  let selectedToc: Heading | undefined = undefined

  const sectionElement: Record<Ref<CardSection>, HTMLDivElement | undefined> = {}
  const sectionRef: Record<Ref<CardSection>, SvelteComponent | undefined> = {}
  const sectionLoaded: Record<Ref<CardSection>, boolean | undefined> = {}
  let sectionOverlays: Record<Ref<CardSection>, boolean> = {}

  let toc: Heading[] = []
  let subTocBySection: Record<string, Heading[]> = {}

  let isScrollInitialized = false
  let isNavigating = false
  let showOverlay = false
  let timer: any
  let hideBar: boolean = false

  let bottomOffset: number = 0

  let sections: CardSection[] = []
  $: void getCardSections(doc).then((res) => {
    sections = res
  })

  let defaults: CardViewDefaults | undefined = client
    .getHierarchy()
    .classHierarchyMixin(doc._class, card.mixin.CardViewDefaults)
  $: defaults = client.getHierarchy().classHierarchyMixin(doc._class, card.mixin.CardViewDefaults)

  let renderTopSections = defaults?.defaultSection !== communication.ids.CardMessagesSection

  export function scrollDown (): void {
    if (scrollDiv == null) return
    const lastTocItem = toc[toc.length - 1]
    if (lastTocItem === undefined) return

    selectedToc = lastTocItem
    void navigate()
  }

  export function editLastMessage (): void {
    sectionRef[messagesId]?.editLastMessage?.()
  }

  export function hideScrollBar (): void {
    hideBar = true
    if (timer != null) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      hideBar = false
    }, 1000)
  }

  function getBottomOffset (): number {
    if (scrollDiv == null) return 0
    return Math.max(0, Math.floor(scrollDiv.scrollHeight - scrollDiv.scrollTop - scrollDiv.clientHeight))
  }

  async function navigate (): Promise<void> {
    if (selectedToc === undefined) return
    if (selectedToc.id !== messagesId && !renderTopSections) {
      renderTopSections = true
      await tick()
    }
    const sectionId = selectedToc.group as Ref<CardSection>

    const ref = sectionRef[sectionId]
    const isInnerNavigation = selectedToc.id !== sectionId || sectionId === messagesId
    if (ref?.navigate != null && isInnerNavigation) {
      isNavigating = true
      ref.navigate(selectedToc.id)
    } else {
      sectionElement[sectionId]?.scrollIntoView()
      isNavigating = false
    }
    isScrollInitialized = true
  }

  function updateToc (sections: CardSection[], subTocBySection: Record<string, Heading[]>): void {
    if (sections.length === 0) return

    toc = getCardToc(sections, subTocBySection)

    if (selectedToc == null || toc.findIndex((it) => it.id === selectedToc?.id) === -1) {
      selectedToc = toc.find((it) => it.group === defaults?.defaultSection) ?? toc[0]

      isScrollInitialized = isScrollInitialized || selectedToc.id === toc[0].id
    }
  }

  function handleNavigationClick (heading: Heading): void {
    if (heading.group !== messagesId) {
      renderTopSections = true
    }
    selectedToc = heading
    void navigate()
  }

  function handleSectionLoaded (_id: Ref<CardSection>): void {
    const wasLoaded = sectionLoaded[_id] === true
    sectionLoaded[_id] = true
    if (!wasLoaded && selectedToc?.group === _id) {
      void navigate()
    }
  }

  function handleChangeNavigation (section: Ref<CardSection>, id: string): void {
    if (selectedToc?.group !== section) return
    selectedToc = toc.find((it) => it.group === section && it.id === id)
  }

  function handleAction (section: Ref<CardSection>, action: CardSectionAction): void {
    if (action.id === 'toc') {
      subTocBySection[section] = action.toc
      subTocBySection = subTocBySection
    }

    if (action.id === 'overlay') {
      sectionOverlays[section] = action.show
      sectionOverlays = sectionOverlays
    }

    if (action.id === 'hideScrollBar') {
      hideScrollBar()
    }
  }

  function handleScroll (): void {
    if (scrollDiv == null || showOverlay) return

    const allLoaded = renderTopSections
      ? sections.every(({ _id }) => sectionLoaded[_id] === true)
      : sectionLoaded[messagesId] === true
    if (!allLoaded) return

    const scrollTop = scrollDiv.scrollTop ?? 0
    const offsets: Array<{ _id: Ref<CardSection>, offsetTop: number }> = []

    for (const t of toc) {
      const _id = t.group as Ref<CardSection>
      if (!renderTopSections && _id !== messagesId) continue
      if (offsets.some((it) => it._id === _id)) continue
      const ref = sectionElement[_id]
      if (ref != null) {
        offsets.push({ _id, offsetTop: ref.offsetTop ?? 0 })
      }
    }

    offsets.sort((a, b) => a.offsetTop - b.offsetTop)

    const newSelectedId = offsets.filter((it) => it.offsetTop <= scrollTop + 50).pop()?._id

    if (newSelectedId != null) {
      if (isNavigating) {
        isNavigating = newSelectedId !== selectedToc?.group
      } else if (newSelectedId !== selectedToc?.group) {
        selectedToc = toc.find((it) => it.group === newSelectedId)
      }
    }

    bottomOffset = getBottomOffset()
  }

  function handleScrollDown (): void {
    const ref = sectionRef[messagesId]
    if (ref?.scrollDown != null) {
      ref.scrollDown()
    } else {
      console.warn('scrollDown not implemented for section', messagesId)
    }
  }

  function canScrollDown (): boolean {
    const ref = sectionRef[messagesId]
    if (ref === undefined) return false

    return ref.canScrollDown?.() ?? false
  }

  $: updateToc(sections, subTocBySection)
  $: showOverlay = !isScrollInitialized || Object.values(sectionOverlays).some((it) => it)

  const onRenderTopChange = (active: boolean): void => {
    renderTopSections = active
  }

  const bottomPadding = getMetadata(communication.metadata.Enabled) === true ? 'var(--spacing-3)' : undefined
</script>

<div class="hulyComponent-content__container columns relative">
  {#if showOverlay}
    <div class="overlay">
      <Loading />
    </div>
  {/if}
  <div class="hulyComponent-content__column content">
    <div class="toc-container" class:hidden={showOverlay}>
      <div class="toc">
        <TableOfContents
          items={toc}
          selected={toc.find((it) => it.id === selectedToc?.id)}
          position="right"
          on:select={(evt) => {
            handleNavigationClick(evt.detail)
          }}
        />
      </div>
    </div>
    <Scroller
      padding="0"
      {hideBar}
      {bottomPadding}
      disablePointerEventsOnScroll
      disableOverscroll
      bind:divScroll={scrollDiv}
      onScroll={handleScroll}
    >
      <div class="hulyComponent-content withoutMaxWidth" class:gap={renderTopSections}>
        {#each sections as section (section._id)}
          <div id={section._id} bind:this={sectionElement[section._id]} class="section">
            <Component
              is={section.component}
              bind:innerRef={sectionRef[section._id]}
              showLoading={false}
              props={{
                doc,
                readonly,
                scrollDiv,
                contentDiv: sectionElement[section._id],
                navigation: selectedToc?.id,
                hidden: !renderTopSections,
                isDefault: defaults?.defaultSection === section._id,
                active: selectedToc?.group === section._id,
                context,
                isContextLoaded,
                onRenderTopChange
              }}
              on:loaded={() => {
                handleSectionLoaded(section._id)
              }}
              on:change={(ev) => {
                handleChangeNavigation(section._id, ev.detail)
              }}
              on:action={(ev) => {
                handleAction(section._id, ev.detail)
              }}
            />
          </div>
        {/each}
      </div>
    </Scroller>
    {#if toc.length > 0 && (bottomOffset > 400 || canScrollDown()) && selectedToc?.group === messagesId}
      <div class="down-button">
        <ModernButton
          label={communication.string.ArrowDownMessages}
          shape="round"
          size="small"
          kind="primary"
          on:click={handleScrollDown}
        />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--theme-panel-color);
  }

  .toc-container {
    position: absolute;
    pointer-events: none;
    //inset: 0;
    z-index: 1;
    top: 0;
    right: 0.25rem;
    width: 2rem;
    height: fit-content;

    &.hidden {
      display: none;
    }
  }

  .toc {
    width: 2rem;
    pointer-events: all;
    position: sticky;
  }

  .section {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-self: stretch;
  }

  .down-button {
    position: absolute;
    width: 100%;
    display: flex;
    justify-content: center;
    bottom: 0.5rem;
    animation: 0.5s fadeIn;
    animation-fill-mode: forwards;
    visibility: hidden;
    left: 0;
    right: 0;
  }

  @keyframes fadeIn {
    99% {
      visibility: hidden;
    }
    100% {
      visibility: visible;
    }
  }
</style>
