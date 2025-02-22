<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import {
    Label,
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
    resultEmojis,
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
  import EmojiButton from './EmojiButton.svelte'
  import ActionsPopup from './ActionsPopup.svelte'
  import SkinTonePopup from './SkinTonePopup.svelte'
  import IconSearch from './icons/Search.svelte'

  export let embedded = false
  export let selected: string | undefined
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()
  closeTooltip()

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
  let emojisCat = emojiCategories.filter(
    (em) => em.categories !== undefined || (Array.isArray(em.emojis) && em.emojis.length > 0)
  )

  let currentCategory = emojisCat[0]

  function handleScrollToCategory (categoryId: string) {
    if (searching && categoryId !== searchCategory[0].id) $searchEmoji = ''

    setTimeout(() => {
      const labelElement = document.getElementById(categoryId)
      if (labelElement) {
        const emojisElement = labelElement.nextElementSibling as HTMLElement
        scrollElement.scroll(0, emojisElement.offsetTop - $deviceInfo.fontSize * 1.75)
      }
    }, 0)
  }

  function handleCategoryScrolled () {
    const selectedCategory = emojisCat.find((category) => {
      const labelElement = document.getElementById(category.id)

      if (!labelElement) {
        return false
      }

      const emojisElement = labelElement.nextElementSibling as HTMLElement

      return emojisElement.offsetTop + emojisElement.offsetHeight - emojiRowHeightPx > scrollElement.scrollTop
    })

    if (selectedCategory) {
      currentCategory = selectedCategory
    }
  }

  const selectedEmoji = (event: CustomEvent<{ detail: EmojiWithGroup }>): void => {
    if (event.detail === undefined || typeof event.detail !== 'object') return
    const detail = event.detail as unknown as EmojiWithGroup
    addFrequentlyEmojis(detail.hexcode)
    dispatch('close', detail.emoji)
  }

  function openContextMenu (event: TouchEvent | MouseEvent, _emoji: EmojiWithGroup, remove: boolean): void {
    event.preventDefault()
    const temp = getEmoji(_emoji.hexcode)
    const emoji = temp?.parent ?? temp?.emoji
    if (emoji === undefined) return

    clearTimer()
    shownContext = true
    showPopup(ActionsPopup, { emoji, remove }, eventToHTMLElement(event), (result) => {
      if (result === 'remove') {
        removeFrequentlyEmojis(emoji.hexcode)
        const index = emojisCat.findIndex((ec) => ec.id === 'frequently-used')
        if (index > -1) emojisCat[index].emojis = getFrequentlyEmojis()
        emojisCat = emojisCat.filter(
          (em) => em.categories !== undefined || (Array.isArray(em.emojis) && em.emojis.length > 0)
        )
      } else if (result !== undefined) {
        addFrequentlyEmojis(result.hexcode)
        dispatch('close', result.emoji)
      }
      shownContext = false
    })
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

  let hidden: boolean = false
  const checkScroll = (event: Event): void => {
    if (timer != null) clearTimer()
    const target = event.target as HTMLElement
    if (target == null) return
    hidden = target.scrollHeight - target.scrollTop - target.clientHeight < 5
  }
  onMount(() => {
    if (scrollElement !== undefined) scrollElement.addEventListener('scroll', checkScroll)
  })
  onDestroy(() => {
    if (scrollElement !== undefined) scrollElement.removeEventListener('scroll', checkScroll)
  })
</script>

<div class="hulyPopupEmoji-container" class:embedded>
  <div class="hulyPopupEmoji-header__tabs-wrapper">
    <div class="hulyPopupEmoji-header__tabs">
      {#each searching ? searchCategory.concat(emojisCat) : emojisCat as category}
        <button
          class="hulyPopupEmoji-header__tab"
          class:selected={(searching && searchCategory[0].id === category.id) ||
            (!searching && currentCategory.id === category.id)}
          use:tooltip={{ label: category.label }}
          on:click={() => {
            handleScrollToCategory(category.id)
          }}
        >
          <svelte:component this={category.icon} size={$deviceInfo.isMobile ? 'large' : 'x-large'} />
        </button>
      {/each}
      <div
        style:left={`${
          (searching ? 0 : emojisCat.findIndex((ec) => ec.id === currentCategory.id)) *
          ($deviceInfo.isMobile ? 2 : 2.25)
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
  <Scroller bind:divScroll={scrollElement} checkForHeaders noStretch on:scrolledCategories={handleCategoryScrolled}>
    {#each searching ? searchCategory : emojisCat as group}
      {@const canRemove = group.id === 'frequently-used'}
      {@const emojisGroup = searching
        ? $resultEmojis
        : Array.isArray(group.emojis)
          ? group.emojis
          : $resultEmojis.filter((re) => re.key === group.id)}
      <div class="hulyPopupEmoji-group">
        <div id={group.id} class="hulyPopupEmoji-group__header categoryHeader">
          <Label label={searching && $resultEmojis.length === 0 ? plugin.string.NoResults : group.label} />
        </div>
        <div class="hulyPopupEmoji-group__palette">
          {#each emojisGroup as emoji}
            <EmojiButton
              {emoji}
              selected={emoji.emoji === selected}
              {disabled}
              {skinTone}
              on:select={selectedEmoji}
              on:touchstart={(event) => {
                clampedContextMenu(event, emoji, canRemove)
              }}
              on:contextmenu={(event) => {
                handleContextMenu(event, emoji, canRemove)
              }}
            />
          {/each}
        </div>
      </div>
    {/each}
  </Scroller>
  {#if !hidden}<div class="hulyPopupEmoji-footer" />{/if}
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
    min-height: 0;
    min-width: 0;
    user-select: none;

    &:not(.embedded) {
      max-width: 28.625rem;
      min-height: 28.5rem;
      max-height: 28.5rem;
      background: var(--theme-popup-color); // var(--global-popover-BackgroundColor);
      border: 1px solid var(--theme-popup-divider); // var(--global-popover-BorderColor);
      border-radius: var(--small-BorderRadius);
      box-shadow: var(--global-popover-ShadowX) var(--global-popover-ShadowY) var(--global-popover-ShadowBlur)
        var(--global-popover-ShadowSpread) var(--global-popover-ShadowColor);

      :global(.mobile-theme) & {
        max-width: calc(100vw - 2rem);
        max-height: calc(100vw - 2rem);

        .hulyPopupEmoji-header__tabs-wrapper {
          overflow-x: auto;
          min-width: 0;
        }
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
      width: 100%;
      padding: 0.25rem 0.75rem;
      border-bottom: 1px solid var(--theme-popup-divider);
    }
    .hulyPopupEmoji-header__tabs {
      position: relative;
      gap: 0.25rem;
      margin: 0.25rem 0;
      width: 100%;
    }
    .hulyPopupEmoji-header__tab {
      justify-content: center;
      width: 2rem;
      height: 2rem;
      color: var(--theme-halfcontent-color);
      transition: color 0.1s linear;

      :global(.mobile-theme) & {
        width: 1.75rem;
        height: 1.75rem;
      }
      :global(svg) {
        transform: scale(0.8);
        transition: transform 0.15s ease-in-out;
      }

      &.selected {
        color: var(--theme-caption-color);

        :global(svg) {
          transform: scale(1);
        }
      }
      &:enabled:hover {
        color: var(--theme-content-color);
      }
    }
    .hulyPopupEmoji-header__tab-cursor {
      position: absolute;
      bottom: calc(-0.5rem - 1px);
      width: 2rem;
      height: 0.25rem;
      background-color: var(--global-focus-BorderColor);
      transition: left 0.15s ease-in-out;

      :global(.mobile-theme) & {
        width: 1.75rem;
      }
    }
    .hulyPopupEmoji-header__tools {
      gap: 0.5rem;
      padding: 0 0.75rem;
    }

    .hulyPopupEmoji-group {
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
      min-width: 0;
      min-height: 0;

      &__header {
        position: sticky;
        flex-shrink: 0;
        margin: 0.75rem 0.75rem 0.25rem;
        padding: 0.25rem 0.375rem;
        top: 0;
        height: 1.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        text-shadow: 0 0 0.25rem var(--theme-popup-color);
        color: var(--theme-caption-color);
        border-radius: 0.25rem;
        z-index: 1;
        pointer-events: none;

        &:first-child {
          margin-top: 0;
        }
        &::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 0;
          width: 100%;
          height: 150%;
          background: var(--theme-popup-trans-gradient);
          z-index: -1;
        }
      }
      &__palette {
        display: flex;
        flex-wrap: wrap;
        flex-shrink: 0;
        margin-left: 0.75rem;
        font-size: 1.25rem;
      }
    }
    .hulyPopupEmoji-group + .hulyPopupEmoji-group {
      margin-top: 0.5rem;
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
