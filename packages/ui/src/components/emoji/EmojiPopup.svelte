<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import type { Emoji } from 'emojibase'
  import {
    Scroller,
    SearchInput,
    tooltip,
    deviceOptionsStore as deviceInfo,
    showPopup,
    eventToHTMLElement,
    ButtonBase,
    closeTooltip
  } from '../../'
  import plugin from '../../plugin'
  import {
    searchEmoji,
    emojiStore,
    generateSkinToneEmojis,
    emojiCategories,
    getFrequentlyEmojis,
    addFrequentlyEmojis,
    removeFrequentlyEmojis,
    getEmoji,
    getSkinTone,
    setSkinTone
  } from '.'
  import type { EmojiWithGroup, EmojiCategory } from '.'
  import ActionsPopup from './ActionsPopup.svelte'
  import SkinTonePopup from './SkinTonePopup.svelte'
  import IconSearch from './icons/Search.svelte'
  import EmojiGroup from './EmojiGroup.svelte'

  export let embedded = false
  export let selected: string | undefined
  export let disabled: boolean = false
  export let kind: 'default' | 'fade' = 'fade'

  const dispatch = createEventDispatcher()

  let scrollElement: HTMLDivElement
  const touchEvents = ['touchend', 'touchcancel', 'touchmove']
  let skinTone: number = getSkinTone()
  let shownSTM: boolean = false
  let shownContext: boolean = false
  $: emojiRowHeightPx = ($deviceInfo.fontSize ?? 16) * 2
  $searchEmoji = ''
  $: searching = $searchEmoji !== ''
  const searchCategory: EmojiCategory[] = [
    {
      id: 'search-category',
      label: plugin.string.SearchResults,
      icon: IconSearch
    }
  ]
  let timer: any = null
  const isMobile = $deviceInfo.isMobile

  let emojisCat = emojiCategories
  let currentCategory = emojisCat[0]
  $: emojiTabs = emojisCat
    .map((ec) => {
      if (ec.categories !== undefined || ec.emojisString !== undefined || ec.emojis !== undefined) {
        return { id: ec.id, label: ec.label, icon: ec.icon }
      } else return undefined
    })
    .filter((f) => f !== undefined) as EmojiCategory[]
  $: categoryTabs = searching ? ([...searchCategory, ...emojiTabs] as EmojiCategory[]) : emojiTabs

  function handleScrollToCategory (categoryId: string): void {
    if (searching && categoryId !== searchCategory[0].id) $searchEmoji = ''
    if (isMobile) {
      const tempCat = emojiTabs.find((ct) => ct?.id === categoryId)
      if (tempCat === undefined) return
      currentCategory = tempCat
      outputGroups = updateGroups(searching, emojisCat)
    } else {
      setTimeout(() => {
        const labelElement = document.getElementById(categoryId)
        if (labelElement) {
          const emojisElement = labelElement.nextElementSibling as HTMLElement
          scrollElement.scroll(0, emojisElement.offsetTop - $deviceInfo.fontSize * 1.75)
        }
      })
    }
  }

  function handleCategoryScrolled (): void {
    if (isMobile) return
    const selectedCategory = emojisCat.find((category) => {
      const labelElement = document.getElementById(category.id)
      if (labelElement == null) return false
      const emojisElement = labelElement.nextElementSibling as HTMLElement

      return emojisElement.offsetTop + emojisElement.offsetHeight - emojiRowHeightPx > scrollElement.scrollTop
    })
    if (selectedCategory !== undefined) currentCategory = selectedCategory
  }

  const sendEmoji = (emoji: Emoji | EmojiWithGroup): void => {
    selected = emoji.emoji
    addFrequentlyEmojis(emoji.hexcode)
    dispatch('close', {
      emoji: emoji.emoji,
      codes: emoji.hexcode.split('-').map((hc) => parseInt(hc, 16))
    })
  }

  const selectedEmoji = (event: CustomEvent<{ detail: EmojiWithGroup }>): void => {
    if (event.detail === undefined || typeof event.detail !== 'object') return
    const detail = event.detail as unknown as EmojiWithGroup
    sendEmoji(detail)
  }

  function openContextMenu (event: TouchEvent | MouseEvent, _emoji: EmojiWithGroup, remove: boolean): void {
    event.preventDefault()
    const temp = getEmoji(_emoji.hexcode)
    const emoji = temp?.parent ?? temp?.emoji
    if (emoji === undefined) return

    clearTimer()
    shownContext = true
    showPopup(
      ActionsPopup,
      { emoji, remove },
      eventToHTMLElement(event),
      (result: 'remove' | Emoji | EmojiWithGroup) => {
        if (result === 'remove') {
          removeFrequentlyEmojis(emoji.hexcode)
          const index = emojisCat.findIndex((ec) => ec.id === 'frequently-used')
          if (index > -1) emojisCat[index].emojis = getFrequentlyEmojis()
          emojisCat = emojisCat.filter(
            (em) => em.categories !== undefined || (Array.isArray(em.emojis) && em.emojis.length > 0)
          )
          if (currentCategory.emojis?.length === 0) {
            currentCategory = emojisCat.find((ec) => ec.emojis !== undefined && ec.emojis.length > 0) ?? emojisCat[0]
          }
        } else if (result !== undefined) {
          sendEmoji(result)
        }
        shownContext = false
      }
    )
  }
  function handleContextMenu (event: MouseEvent, emoji: EmojiWithGroup, remove: boolean): void {
    event.preventDefault()
    if (Array.isArray(emoji.skins) || remove) openContextMenu(event, emoji, remove)
  }
  const clearTimer = (): void => {
    clearTimeout(timer)
    touchObserver(true)
  }
  const touchObserver = (remove: boolean = false): void => {
    touchEvents.forEach((event) => {
      if (remove) window.removeEventListener(event, clearTimer)
      else window.addEventListener(event, clearTimer)
    })
  }
  function clampedContextMenu (event: TouchEvent, emoji: EmojiWithGroup, remove: boolean): void {
    if (timer == null && (Array.isArray(emoji?.skins) || remove)) {
      touchObserver()
      timer = setTimeout(function () {
        if (!shownContext) openContextMenu(event, emoji, remove)
        clearTimer()
      }, 1000)
    }
  }

  const showSkinMenu = (event: MouseEvent): void => {
    shownSTM = true
    showPopup(SkinTonePopup, { emoji: 0x1f590, selected: skinTone }, eventToHTMLElement(event), (result) => {
      if (typeof result === 'number') {
        skinTone = result
        setSkinTone(skinTone)
      }
      shownSTM = false
    })
  }

  let hidden: boolean = true
  const checkScroll = (event: Event): void => {
    if (timer != null) clearTimer()
    const target = event.target as HTMLElement
    if (target == null) return
    hidden = target.scrollHeight - target.scrollTop - target.clientHeight < 5
  }

  const initEmoji = (): void => {
    emojiCategories.forEach((em, index) => {
      if (em.id === 'frequently-used') {
        emojiCategories[index].emojis = getFrequentlyEmojis()
      }
      if (em.emojisString !== undefined && Array.isArray(em.emojisString) && em.emojis === undefined) {
        const tempEmojis: string[] = em.emojisString
        const emojis: EmojiWithGroup[] = []
        tempEmojis.forEach((te) => {
          const e = $emojiStore.find((es) => es.hexcode === te)
          if (e !== undefined) emojis.push(e)
        })
        emojiCategories[index].emojis = emojis
      }
    })
    emojisCat = emojiCategories.filter(
      (em) => em.categories !== undefined || (Array.isArray(em.emojis) && em.emojis.length > 0)
    )
    currentCategory = emojisCat.find((ec) => ec.emojis !== undefined) ?? emojisCat[0]
  }

  onMount(() => {
    if (scrollElement !== undefined) scrollElement.addEventListener('scroll', checkScroll)
    closeTooltip()
    setTimeout(initEmoji)
  })
  onDestroy(() => {
    if (scrollElement !== undefined) scrollElement.removeEventListener('scroll', checkScroll)
  })

  const updateGroups = (s: boolean, ec: EmojiCategory[]): EmojiCategory[] => {
    return s ? searchCategory : isMobile ? ec.filter((e) => e.id === currentCategory.id) : ec
  }
  $: outputGroups = updateGroups(searching, emojisCat)
</script>

<div class="hulyPopupEmoji-container kind-{kind}" class:embedded>
  <div class="hulyPopupEmoji-header__tabs-wrapper">
    <div class="hulyPopupEmoji-header__tabs">
      {#each categoryTabs as category (category.id)}
        <button
          class="hulyPopupEmoji-header__tab"
          class:selected={(searching && searchCategory[0].id === category.id) ||
            (!searching && currentCategory.id === category.id)}
          data-id={category.id}
          use:tooltip={{ label: category.label }}
          on:click={() => {
            handleScrollToCategory(category.id)
          }}
        >
          <svelte:component this={category.icon} size={isMobile ? 'large' : 'x-large'} />
        </button>
      {/each}
      <div
        style:left={`${
          (searching ? 0 : emojisCat.findIndex((ec) => ec.id === currentCategory.id)) * (isMobile ? 1.875 : 2.125)
        }rem`}
        class="hulyPopupEmoji-header__tab-cursor"
      />
    </div>
  </div>
  <div class="hulyPopupEmoji-header__tools">
    <SearchInput
      value={$searchEmoji}
      placeholder={plugin.string.SearchDots}
      width={'100%'}
      autoFocus
      delay={50}
      on:change={(result) => {
        if (result.detail !== undefined) $searchEmoji = result.detail
        else if (result.detail !== '') currentCategory = searchCategory[0]
      }}
    />
    <ButtonBase
      type={'type-button-icon'}
      hasMenu
      pressed={shownSTM}
      kind={'tertiary'}
      size={'small'}
      tooltip={{ label: plugin.string.DefaultSkinTone }}
      on:click={showSkinMenu}
    >
      <span style:font-size={'1.5rem'}>{generateSkinToneEmojis(0x1f590)[skinTone]}</span>
    </ButtonBase>
  </div>
  <Scroller
    bind:divScroll={scrollElement}
    gap="0.5rem"
    checkForHeaders
    noStretch
    on:scrolledCategories={handleCategoryScrolled}
  >
    {#each outputGroups as group (group.id)}
      {@const canRemove = group.id === 'frequently-used'}
      <EmojiGroup
        {group}
        {searching}
        {disabled}
        {selected}
        {skinTone}
        {kind}
        lazy={group.id !== 'frequently-used'}
        on:select={selectedEmoji}
        on:touchstart={(ev) => {
          const { event, emoji } = ev.detail
          clampedContextMenu(event, emoji, canRemove)
        }}
        on:contextmenu={(ev) => {
          const { event, emoji } = ev.detail
          handleContextMenu(event, emoji, canRemove)
        }}
      />
    {/each}
  </Scroller>
  {#if !hidden && kind === 'fade'}<div class="hulyPopupEmoji-footer" />{/if}
</div>

<style lang="scss">
  .hulyPopupEmoji-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 28.5rem;
    max-height: 28.5rem;
    user-select: none;

    :global(.mobile-theme) & {
      min-width: 0;
      max-width: calc(100vw - 2rem);
      min-height: 0;
      max-height: calc(100% - 4rem);
    }

    &:not(.embedded) {
      min-width: 25.5rem;
      max-width: 25.5rem;
      background: var(--theme-popup-color); // var(--global-popover-BackgroundColor);
      border: 1px solid var(--theme-popup-divider); // var(--global-popover-BorderColor);
      border-radius: var(--small-BorderRadius);
      box-shadow: var(--global-popover-ShadowX) var(--global-popover-ShadowY) var(--global-popover-ShadowBlur)
        var(--global-popover-ShadowSpread) var(--global-popover-ShadowColor);

      :global(.mobile-theme) & {
        max-width: 100%;
        max-height: 100%;
      }
    }

    .hulyPopupEmoji-header__tools,
    .hulyPopupEmoji-header__tabs-wrapper,
    .hulyPopupEmoji-header__tabs,
    .hulyPopupEmoji-header__tab {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      min-width: 0;
      min-height: 0;
    }

    .hulyPopupEmoji-header__tabs-wrapper {
      overflow-x: auto;
      padding: 0.25rem 0.75rem;
      width: 100%;
      border-bottom: 1px solid var(--theme-popup-divider);
    }
    .hulyPopupEmoji-header__tabs {
      position: relative;
      gap: 0.125rem;
      width: 100%;
    }
    .hulyPopupEmoji-header__tab {
      justify-content: center;
      width: 2rem;
      height: 2rem;
      color: var(--theme-halfcontent-color);
      transition: color 0.15s ease-in;
      transition: left 0.15s ease-in;

      &:disabled,
      &.disabled {
        color: var(--theme-darker-color);
      }
      :global(.mobile-theme) & {
        width: 1.75rem;
        height: 1.75rem;
      }
      :global(svg) {
        transform: scale(0.8);
        transition: transform 0.15s ease-in-out;
      }

      &:not(:disabled, .disabled) {
        &.selected {
          color: var(--theme-caption-color);

          :global(svg) {
            transform: scale(1);
          }
        }
        &:hover {
          color: var(--theme-content-color);
        }
      }
    }
    .hulyPopupEmoji-header__tab-cursor {
      position: absolute;
      bottom: -0.25rem;
      width: 2rem;
      height: 0.125rem;
      background-color: var(--theme-tablist-plain-color);
      transition: left 0.15s ease-in;

      :global(.mobile-theme) & {
        width: 1.75rem;
      }
    }
    .hulyPopupEmoji-header__tools {
      gap: 0.5rem;
      padding: 0 0.75rem;
    }

    .hulyPopupEmoji-footer {
      position: absolute;
      left: 50%;
      bottom: 0.75rem;
      width: calc(100% - 1.5rem);
      height: 1rem;
      background: var(--theme-popup-trans-gradient);
      transform-origin: center;
      transform: translateX(-50%) rotate(180deg);
      z-index: 1;
      pointer-events: none;
    }
  }
</style>
