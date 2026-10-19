<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { isCustomEmoji, type ExtendedEmoji } from '@hcengineering/emoji'
  import { getBlobRef } from '@hcengineering/presentation'
  import { ListView, showPopup, resizeObserver, deviceOptionsStore as deviceInfo, PopupResult } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import DummyPopup from './DummyPopup.svelte'

  export let items: ExtendedEmoji[] = []
  export let query: string = ''
  export let clientRect: (() => ClientRect | null) | null | undefined = undefined
  export let command: (props: ExtendedEmoji) => void
  export let close: () => void

  let popup: HTMLDivElement
  let dummyPopup: PopupResult | undefined
  let list: ListView
  let selection = 0

  $: visible = items.length > 0
  // Not a reactive assignment: with `$: selection = ...` the ListView binding would also invalidate `items`
  // and reset the selection on every arrow key or hover
  $: resetSelection(items)

  function resetSelection (items: ExtendedEmoji[]): void {
    selection = 0
  }

  // Register in the popup stack only while the list is shown, so it can be closed like other popups
  $: if (visible && dummyPopup === undefined) {
    dummyPopup = showPopup(DummyPopup, {}, undefined, close, () => {}, { overlay: false, category: '' })
  } else if (!visible && dummyPopup !== undefined) {
    dummyPopup.close()
    dummyPopup = undefined
  }

  onDestroy(() => {
    dummyPopup?.close()
  })

  function getShortcode (emoji: ExtendedEmoji): string {
    if (isCustomEmoji(emoji)) return emoji.shortcode
    const lowerQuery = query.toLowerCase()
    const shortcodes = emoji.shortcodes ?? []
    return shortcodes.find((s) => s.toLowerCase().startsWith(lowerQuery)) ?? shortcodes[0] ?? emoji.label
  }

  export function onKeyDown (ev: KeyboardEvent): boolean {
    if (!visible) return false
    if (ev.key === 'ArrowDown') {
      ev.stopPropagation()
      ev.preventDefault()
      list?.select(selection + 1)
      return true
    }
    if (ev.key === 'ArrowUp') {
      ev.stopPropagation()
      ev.preventDefault()
      list?.select(selection - 1)
      return true
    }
    if (ev.key === 'Enter' || ev.key === 'Tab') {
      ev.preventDefault()
      ev.stopPropagation()
      const emoji = items[selection] ?? items[0]
      if (emoji !== undefined) command(emoji)
      return true
    }
    return false
  }

  export function done (): void {}

  function updateStyle (): void {
    const rect = clientRect?.()
    if (popup == null || rect == null) return
    const wDoc = $deviceInfo.docWidth
    const hDoc = $deviceInfo.docHeight
    let tempStyle = ''
    if (rect.top < hDoc - rect.bottom) {
      const maxH: number = hDoc - rect.bottom - 40 >= 320 ? 320 : hDoc - rect.bottom - 40
      tempStyle = `top: calc(${rect.bottom}px + .75rem); max-height: ${maxH}px; `
    } else {
      const maxH: number = rect.top - 40 >= 320 ? 320 : rect.top - 40
      tempStyle = `bottom: calc(${hDoc - rect.top}px + .75rem); max-height: ${maxH}px; `
    }
    if (rect.left + wPopup > wDoc - 16) {
      tempStyle += 'right: 1rem;'
    } else {
      tempStyle += `left: ${rect.left}px;`
    }
    style = tempStyle
  }

  let style = 'visibility: hidden'
  let wPopup: number = 0
</script>

<svelte:window
  on:resize={() => {
    updateStyle()
  }}
/>
{#if visible}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="overlay"
    on:click={() => {
      close()
    }}
  />
  <div
    bind:this={popup}
    class="emoji-completion"
    {style}
    use:resizeObserver={(element) => {
      wPopup = element.clientWidth
      updateStyle()
    }}
  >
    <div class="antiPopup">
      <div class="ap-space" />
      <div class="ap-scroll">
        <div class="ap-box">
          <ListView bind:this={list} bind:selection count={items.length}>
            <svelte:fragment slot="item" let:item={num}>
              {@const emoji = items[num]}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="ap-menuItem withComp h-8 gap-2"
                on:click={() => {
                  command(emoji)
                }}
              >
                <span class="emoji">
                  {#if isCustomEmoji(emoji)}
                    {#await getBlobRef(emoji.image) then blob}
                      <img src={blob.src} alt={`:${emoji.shortcode}:`} />
                    {/await}
                  {:else}
                    {emoji.emoji}
                  {/if}
                </span>
                <span class="overflow-label">:{getShortcode(emoji)}:</span>
              </div>
            </svelte:fragment>
          </ListView>
        </div>
      </div>
      <div class="ap-space" />
    </div>
  </div>
{/if}

<style lang="scss">
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 1999;
  }

  .emoji-completion {
    position: absolute;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    max-width: 20rem;
    z-index: 10001;
  }

  .emoji {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    font-size: 1.125rem;

    img {
      width: 1.25rem;
      height: 1.25rem;
      object-fit: contain;
    }
  }
</style>
