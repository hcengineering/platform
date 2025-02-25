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
  import { Asset, Metadata } from '@hcengineering/platform'
  import {
    ButtonIcon,
    EmojiPopup,
    TabsControl,
    fromCodePoint,
    Scroller,
    getPlatformColor,
    getPlatformColorDef,
    themeStore,
    Label
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { iconsLibrary } from '../icons'
  import view from '../plugin'
  import ColorsPopup from './ColorsPopup.svelte'

  export let icon: Metadata<string> | undefined = undefined
  export let icons: Asset[] = iconsLibrary
  export let iconWithEmoji: Asset = view.ids.IconWithEmoji
  export let color: number | number[] = 0
  export let showColor: boolean = true
  export let showEmoji: boolean = true

  const dispatch = createEventDispatcher()

  let _color = color
  let _icon = icon ?? icons[0]

  let model = showEmoji
    ? [{ label: view.string.IconCategory }, { label: view.string.EmojiCategory }]
    : [{ label: view.string.IconCategory }]
  $: model = showEmoji
    ? [{ label: view.string.IconCategory }, { label: view.string.EmojiCategory }]
    : [{ label: view.string.IconCategory }]
</script>

<div class="hulyPopup-container noPadding autoWidth maxWidth">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <TabsControl size={'small'} {model} selected={icon === iconWithEmoji ? 1 : 0} padding={'0 .75rem'} gap={'medium'}>
    <svelte:fragment slot="content" let:selected>
      {#if selected === 0}
        <div class="flex-col mb-2">
          <Scroller noStretch>
            {#if icons.length > 0}
              <div class="pallete">
                {#each icons as obj}
                  <ButtonIcon
                    icon={obj}
                    iconSize={'medium'}
                    iconProps={showColor
                      ? { fill: obj === _icon ? 'currentColor' : getPlatformColor(_color ?? 0, $themeStore.dark) }
                      : undefined}
                    size={'medium'}
                    kind={obj === _icon ? 'primary' : 'tertiary'}
                    on:click={() => {
                      _icon = obj
                      dispatch(!showColor ? 'close' : 'update', { icon: _icon, color: _color })
                    }}
                  />
                {/each}
                <div class="clear-mins flex-grow" />
              </div>
            {/if}
          </Scroller>
          {#if showColor}
            <div class="subheader"><Label label={view.string.ChooseAColor} /></div>
            <ColorsPopup
              selected={getPlatformColorDef(_color, $themeStore.dark).name}
              columns={'auto'}
              embedded
              on:close={(evt) => {
                _color = evt.detail
                dispatch(icons.length === 0 ? 'close' : 'update', {
                  icon: icons.length === 0 ? null : _icon,
                  color: _color
                })
              }}
            />
          {/if}
        </div>
      {:else}
        <EmojiPopup
          embedded
          selected={Array.isArray(color) ? fromCodePoint(...color) : fromCodePoint(color)}
          on:close={(evt) => {
            dispatch('close', { icon: iconWithEmoji, color: evt.detail.codes })
          }}
        />
      {/if}
    </svelte:fragment>
  </TabsControl>
</div>

<style lang="scss">
  .pallete {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    flex-shrink: 0;
    gap: 0.125rem;
    margin: 0.25rem 0.75rem;
    font-size: 1.25rem;
  }
  .hulyPopup-container.maxWidth {
    min-width: 25.5rem;
    max-width: 25.5rem;
    min-height: 12rem;
    max-height: 35rem;

    :global(.mobile-theme) & {
      min-width: 0;
      max-width: calc(100vw - 2rem);
      min-height: 0;
      max-height: calc(100% - 4rem);
    }
  }
  .subheader {
    margin: 0.75rem 1rem 0;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-caption-color);
  }
</style>
