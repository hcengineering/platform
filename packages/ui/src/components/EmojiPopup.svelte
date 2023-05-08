<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import emojiRegex from 'emoji-regex'
  import { createEventDispatcher, getContext } from 'svelte'
  import { tooltip } from '../tooltips'
  import { AnySvelteComponent, emojiSP } from '../types'
  import Label from './Label.svelte'
  import Scroller from './Scroller.svelte'
  import Emoji from './icons/Emoji.svelte'
  import Food from './icons/Food.svelte'
  import Nature from './icons/Nature.svelte'
  import Objects from './icons/Objects.svelte'
  import Places from './icons/Places.svelte'
  import Symbols from './icons/Symbols.svelte'
  import Work from './icons/Work.svelte'
  import plugin from '../plugin'

  export let embedded = false

  let div: HTMLDivElement
  const regex = emojiRegex()

  const { currentFontSize } = getContext('fontsize') as { currentFontSize: string }

  function getEmojis (startCode: number, endCode: number, postfix?: number[]): (string | undefined)[] {
    return [...Array(endCode - startCode + 1).keys()].map((v) => {
      const str = postfix ? String.fromCodePoint(v + startCode, ...postfix) : String.fromCodePoint(v + startCode)
      if ([...str.matchAll(regex)].length > 0) return str
      return undefined
    })
  }

  interface Category {
    id: string
    label: IntlString
    emojis: (string | undefined)[]
    icon: AnySvelteComponent
  }

  const categories: Category[] = [
    {
      id: 'work',
      label: plugin.string.GettingWorkDone,
      emojis: [
        String.fromCodePoint(0x1f440),
        String.fromCodePoint(0x2705),
        String.fromCodePoint(0x274c),
        String.fromCodePoint(0x2795),
        String.fromCodePoint(0x2796),
        String.fromCodePoint(0x2757),
        String.fromCodePoint(0x0031, 0xfe0f, 0x20e3),
        String.fromCodePoint(0x0032, 0xfe0f, 0x20e3),
        String.fromCodePoint(0x0033, 0xfe0f, 0x20e3),
        String.fromCodePoint(0x1f44b, 0x1f3fc),
        String.fromCodePoint(0x1f44d, 0x1f3fc),
        String.fromCodePoint(0x1f44c, 0x1f3fc)
      ],
      icon: Work
    },
    {
      id: 'smileys',
      label: plugin.string.Smileys,
      emojis: [...getEmojis(0x1f600, 0x1f64f), ...getEmojis(0x1f90c, 0x1f92f)],
      icon: Emoji
    },
    {
      id: 'nature',
      label: plugin.string.Nature,
      emojis: [
        ...getEmojis(0x1f408, 0x1f43e),
        ...getEmojis(0x1f980, 0x1f9ae),
        ...getEmojis(0x1f330, 0x1f343),
        ...getEmojis(0x1f300, 0x1f320),
        ...getEmojis(0x1f324, 0x1f32c, [0xfe0f]),
        ...getEmojis(0x2600, 0x2604, [0xfe0f])
      ],
      icon: Nature
    },
    {
      id: 'travels',
      label: plugin.string.TravelAndPlaces,
      emojis: [...getEmojis(0x1f5fb, 0x1f5ff), ...getEmojis(0x1f3e0, 0x1f3f0), ...getEmojis(0x1f680, 0x1f6a3)],
      icon: Places
    },
    {
      id: 'food',
      label: plugin.string.Food,
      emojis: [...getEmojis(0x1f345, 0x1f37f), ...getEmojis(0x1f32d, 0x1f32f)],
      icon: Food
    },
    {
      id: 'objects',
      label: plugin.string.Objects,
      emojis: [...getEmojis(0x1f4b6, 0x1f4fc)],
      icon: Objects
    },
    {
      id: 'symbols',
      label: plugin.string.Symbols,
      emojis: [
        ...getEmojis(0x00a9, 0x25fc, [0xfe0f]),
        ...getEmojis(0x2764, 0x2b07, [0xfe0f]),
        ...getEmojis(0x0023, 0x0039, [0xfe0f, 0x20e3]),
        ...getEmojis(0x1f532, 0x1f53d)
      ],
      icon: Symbols
    }
  ]
  const dispatch = createEventDispatcher()

  function handleScrollToCategory (categoryId: string) {
    const el = document.getElementById(categoryId)
    if (el) {
      const next = el.nextElementSibling as HTMLElement
      div.scroll(0, next.offsetTop - (currentFontSize === 'small-font' ? 14 : 16) * 1.75)
    }
  }

  let currentCategory = categories[0]
  function handleScrolled (catId?: CustomEvent) {
    if (catId) {
      const curCat = categories.find((it) => it.id === catId.detail[catId.detail.length - 1])
      if (curCat) currentCategory = curCat
    }
  }
</script>

<div class={!embedded ? 'antiPopup antiPopup-withHeader popup' : ''}>
  <div class="flex-row-center popup-header">
    {#each categories as category}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        use:tooltip={{ label: category.label }}
        class="element"
        class:selected={currentCategory === category}
        on:click={() => handleScrollToCategory(category.id)}
      >
        <svelte:component this={category.icon} size={'medium'} opacity={currentCategory === category ? '1' : '0.3'} />
      </div>
    {/each}
  </div>
  <div class="scrolling">
    <Scroller bind:divScroll={div} on:scrolledCategories={handleScrolled} fade={emojiSP} noStretch checkForHeaders>
      {#each categories as category}
        <div id={category.id} class="scroll-header categoryHeader">
          <Label label={category.label} />
        </div>
        <div class="palette ml-3">
          {#each category.emojis as emoji}
            {#if emoji !== undefined}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div class="element" on:click={() => dispatch('close', emoji)}>{emoji}</div>
            {/if}
          {/each}
        </div>
      {/each}
    </Scroller>
  </div>
  <div class="ap-space x2" />
</div>

<style lang="scss">
  .popup {
    height: 21.25rem;
  }
  .scrolling {
    min-height: 0;
    height: 16.5rem;
    max-height: 16.5rem;
  }
  .popup-header {
    margin: 0.75rem 0.75rem 0.5rem;
  }
  .scroll-header {
    position: sticky;
    flex-shrink: 0;
    margin: 0.75rem 0.75rem 0.25rem;
    padding: 0.25rem 0.75rem;
    top: 0;
    height: 1.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-caption-color);
    background-color: var(--theme-popup-header);
    border-radius: 0.25rem;
    &:first-child {
      margin-top: 0;
    }
  }
  .palette {
    display: flex;
    flex-wrap: wrap;
    // width: 19.25rem;
    font-size: 1.25rem;
  }
  .element {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    margin: 0.125rem;
    padding: 0.25rem;
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    cursor: pointer;

    &:hover {
      color: var(--theme-caption-color);
      background-color: var(--theme-popup-hover);
    }

    &.selected {
      background-color: var(--theme-popup-header);
    }
  }
</style>
