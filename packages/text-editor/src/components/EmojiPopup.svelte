<script lang="ts">
  import emojiRegex from 'emoji-regex'
  import { createEventDispatcher } from 'svelte'
  import { IntlString } from '@anticrm/platform'
  import { AnySvelteComponent, Label } from '@anticrm/ui'
  import Tooltip from '@anticrm/ui/src/components/Tooltip.svelte'
  import Emoji from './icons/Emoji.svelte'
  import Food from './icons/Food.svelte'
  import Nature from './icons/Nature.svelte'
  import Objects from './icons/Objects.svelte'
  import Places from './icons/Places.svelte'
  import Symbols from './icons/Symbols.svelte'
  import Work from './icons/Work.svelte'
  import plugin from '../plugin'

  let div: HTMLDivElement
  const regex = emojiRegex()

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

  const headerHeight = 55
  function handleScrollToCategory (categoryId: string) {
    const offset = document.getElementById(categoryId)?.offsetTop
    if (offset) div.scrollTo(0, offset - headerHeight)
  }

  let currentCategory = categories[0]
  const padding = 16
  function handleScroll () {
    const divTop = div?.getBoundingClientRect().top
    const categoryDivs = div.getElementsByClassName('categoryName')
    const i = Array.from(categoryDivs).findIndex((element) => {
      if (element?.nodeType === Node.ELEMENT_NODE) {
        const elementTop = element?.getBoundingClientRect().top
        if (elementTop >= divTop + padding) {
          return true
        }
      }
      return false
    })
    let firstVisibleCategory: Element | null
    if (i > 0) {
      firstVisibleCategory = categoryDivs.item(i - 1)
    } else {
      firstVisibleCategory = categoryDivs.item(categoryDivs.length - 1)
    }
    if (firstVisibleCategory !== null) {
      currentCategory = categories.find((c) => c.id === firstVisibleCategory!.id) ?? categories[0]
    }
  }
</script>

<div class="antiPopup antiPopup-withHeader pb-3 popup">
  <div class="flex-between ml-4 pt-2 pb-2 mr-4 header">
    {#each categories as category}
      <Tooltip label={category.label}>
        <div
          class="flex-grow pt-2 pb-2 pl-2 pr-2 element"
          class:selected={currentCategory === category}
          on:click={() => handleScrollToCategory(category.id)}
        >
          <svelte:component this={category.icon} size={'large'} opacity={currentCategory === category ? '1' : '0.3'} />
        </div>
      </Tooltip>
    {/each}
  </div>
  <div class="flex-col vScroll" bind:this={div} on:scroll={handleScroll}>
    <div class="w-85 flex-col">
      {#each categories as category}
        <div class="ap-header">
          <div id={category.id} class="ap-caption categoryName"><Label label={category.label} /></div>
        </div>
        <div class="palette ml-4">
          {#each category.emojis as emoji}
            {#if emoji !== undefined}
              <div class="p-1 element" on:click={() => dispatch('close', emoji)}>{emoji}</div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .popup {
    height: 25rem;
  }
  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    font-size: x-large;
  }

  .element {
    &:hover {
      background-color: var(--popup-bg-hover);
    }

    &.selected {
      background-color: var(--popup-bg-hover);
    }
  }

  .header {
    justify-content: start;
    border-bottom: 1px solid var(--divider-color);
  }
</style>
