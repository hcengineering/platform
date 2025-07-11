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
  import { Component, Loading, Scroller } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { NotificationContext } from '@hcengineering/communication-types'
  import { Ref } from '@hcengineering/core'
  import { SvelteComponent } from 'svelte'
  import { TableOfContents } from '@hcengineering/text-editor-resources'
  import { Heading } from '@hcengineering/text-editor'

  import { CardSectionAction } from '../types'
  import { getResource } from '@hcengineering/platform'

  export let doc: Card
  export let context: NotificationContext | undefined = undefined
  export let isContextLoaded: boolean = false
  export let readonly: boolean = false
  export let scrollDiv: HTMLDivElement | undefined | null = undefined

  const client = getClient()

  let sections: CardSection[] = []
  const _sections: CardSection[] = client
    .getModel()
    .findAllSync(card.class.CardSection, {})
    .sort((a, b) => a.order - b.order)

  let defaults: CardViewDefaults | undefined = undefined
  $: defaults = client.getHierarchy().classHierarchyMixin(doc._class, card.mixin.CardViewDefaults)

  let selectedToc: Heading | undefined = undefined

  const sectionElement: Record<Ref<CardSection>, HTMLElement | undefined> = {}
  const sectionRef: Record<Ref<CardSection>, SvelteComponent | undefined> = {}
  const sectionLoaded: Record<Ref<CardSection>, boolean | undefined> = {}
  let sectionOverlays: Record<Ref<CardSection>, boolean> = {}

  let toc: Heading[] = []
  let subTocBySection: Record<string, Heading[]> = {}

  let isScrollInitialized = false
  let showOverlay = false
  let timer: any
  let hideBar: boolean = false

  function onNavigationClick (heading: Heading): void {
    selectedToc = heading
    navigate()
  }

  function navigate (): void {
    if (selectedToc === undefined) return
    const sectionId = selectedToc.group as Ref<CardSection>

    const ref = sectionRef[sectionId]
    const isInnerNavigation = selectedToc.id !== sectionId
    if (ref?.navigate && isInnerNavigation) {
      ref.navigate(selectedToc.id)
    } else {
      sectionElement[sectionId]?.scrollIntoView()
    }
    isScrollInitialized = true
  }

  function handleSectionLoaded (_id: Ref<CardSection>): void {
    const wasLoaded = sectionLoaded[_id] === true
    sectionLoaded[_id] = true
    if (!wasLoaded && selectedToc?.group === _id) {
      navigate()
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

  function updateToc (sections: CardSection[], tocBySection: Record<string, Heading[]>): void {
    const newToc: Heading[] = []

    for (const section of sections) {
      const subToc = tocBySection[section._id]
      if (section.navigation.length > 0) {
        newToc.push(
          ...section.navigation.map((nav) => ({
            id: nav.id,
            titleIntl: nav.label,
            level: 0,
            group: section._id
          }))
        )
      } else {
        newToc.push({
          id: section._id,
          titleIntl: section.label,
          level: 0,
          group: section._id
        })
      }

      if (subToc !== undefined) {
        newToc.push(...subToc.map((it) => ({ ...it, group: section._id })))
      }
    }

    toc = newToc
    if (selectedToc == null || newToc.findIndex((it) => it.id === selectedToc?.id) === -1) {
      selectedToc =
        newToc.find(
          (it) =>
            it.group === defaults?.defaultSection &&
            (defaults?.defaultNavigation === undefined || it.id === defaults?.defaultNavigation)
        ) ?? newToc[0]
      isScrollInitialized = isScrollInitialized ?? selectedToc.id === newToc[0].id
    }
  }

  export function scrollDown (): void {
    if (scrollDiv == null) return
    const lastTocItem = toc[toc.length - 1]
    if (lastTocItem === undefined) return

    if (selectedToc?.group === lastTocItem.group && selectedToc?.id === lastTocItem.id) {
      scrollDiv?.scroll({ top: scrollDiv.scrollHeight, behavior: 'instant' })
    } else {
      selectedToc = lastTocItem
      navigate()
    }
  }

  export function hideScrollBar (): void {
    hideBar = true
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      hideBar = false
    }, 1000)
  }

  function handleScroll (): void {
    if (scrollDiv == null || showOverlay) return
    const allLoaded = sections.every(({ _id }) => sectionLoaded[_id] === true)
    if (!allLoaded) return
    const scrollTop = scrollDiv.scrollTop ?? 0
    const offsets: Array<{ _id: Ref<CardSection>, offsetTop: number }> = []
    sections.forEach(({ _id }) => {
      const sectionRef = sectionElement[_id]
      if (sectionRef != null && scrollDiv != null) {
        offsets.push({ _id, offsetTop: sectionRef.offsetTop })
      }
    })
    offsets.sort((a, b) => a.offsetTop - b.offsetTop)

    const selectedSectionId = offsets.filter((it) => it.offsetTop <= scrollTop + 50).pop()?._id

    if (selectedSectionId != null && selectedSectionId !== selectedToc?.group) {
      selectedToc = toc.find((it) => it.group === selectedSectionId)
    }
  }

  async function filterSections (s: CardSection[], doc: Card): Promise<void> {
    const newSections: CardSection[] = []
    for (const section of s) {
      if (section.checkVisibility !== undefined) {
        const isVisibleFn = await getResource(section.checkVisibility)
        const isVisible = await isVisibleFn(doc)
        if (isVisible) {
          newSections.push(section)
        }
      } else {
        newSections.push(section)
      }
    }

    sections = newSections
  }

  $: void filterSections(_sections, doc)
  $: updateToc(sections, subTocBySection)
  $: showOverlay = !isScrollInitialized || Object.values(sectionOverlays).some((it) => it)
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
            onNavigationClick(evt.detail)
          }}
        />
      </div>
    </div>
    <Scroller
      padding="0"
      {hideBar}
      bottomPadding="var(--spacing-3)"
      disablePointerEventsOnScroll
      bind:divScroll={scrollDiv}
      onScroll={handleScroll}
    >
      <div class="hulyComponent-content gap withoutMaxWidth">
        {#each sections as section, i}
          <!--NOTE: experimental - do not wait loading of previous sections-->
          <!--{@const isLoadingBefore = sections.slice(0, i).some((section) => sectionLoaded[section._id] === undefined)}-->
          {@const isLoadingBefore = false}
          <div id={section._id} bind:this={sectionElement[section._id]} class="section">
            <Component
              is={section.component}
              bind:innerRef={sectionRef[section._id]}
              showLoading={false}
              props={{
                doc,
                readonly,
                isContextLoaded,
                isLoadingBefore,
                scrollDiv,
                notificationContext: context,
                contentDiv: sectionElement[section._id],
                active: selectedToc?.group === section._id,
                navigation: selectedToc?.id
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
</style>
