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
  import presentation, { Card } from '@hcengineering/presentation'
  import {
    Button,
    EmojiPopup,
    Label,
    TabsControl,
    eventToHTMLElement,
    getPlatformColor,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import ColorsPopup from './ColorsPopup.svelte'

  export let icon: Metadata<string> | undefined = undefined
  export let icons: Asset[]
  export let iconWithEmoji: Asset = view.ids.IconWithEmoji
  export let color: number = 0

  const dispatch = createEventDispatcher()

  let _color = color
  let _icon = icon ?? icons[0]

  function save () {
    dispatch('close', { icon: _icon, color: _color })
  }
  function pickColor (evt: MouseEvent) {
    showPopup(
      ColorsPopup,
      { selected: getPlatformColorDef(_color, $themeStore.dark).name },
      eventToHTMLElement(evt),
      (newColor) => {
        if (newColor != null) {
          _color = newColor
        }
      }
    )
  }
</script>

<Card
  label={view.string.ChooseIcon}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={_icon !== undefined}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="float-left-box">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <TabsControl size={'small'} model={[{ label: view.string.IconCategory }, { label: view.string.EmojiCategory }]}>
      <svelte:fragment slot="content" let:selected>
        {#if selected === 0}
          <div class="flex-row-center">
            <Label label={view.string.IconColor} />
            <div class="flex-no-shrink ml-2 color" on:click={pickColor}>
              <div class="dot" style="background-color: {getPlatformColor(_color ?? 0, $themeStore.dark)}" />
            </div>
          </div>
          {#each icons as obj}
            <div class="float-left p-2">
              <Button
                icon={obj}
                iconProps={{ fill: getPlatformColor(_color ?? 0, $themeStore.dark) }}
                size="medium"
                kind={obj === _icon ? 'accented' : 'ghost'}
                on:click={() => {
                  _icon = obj
                }}
              />
            </div>
          {/each}
        {:else}
          <EmojiPopup
            embedded
            on:close={(evt) => {
              dispatch('close', { icon: iconWithEmoji, color: evt.detail.codePointAt(0) })
            }}
          />
        {/if}
      </svelte:fragment>
    </TabsControl>
  </div>
</Card>

<style lang="scss">
  .color {
    position: relative;
    width: 1.75rem;
    height: 1.75rem;
    background-color: var(--accent-bg-color);
    border: 1px solid transparent;
    border-radius: 0.25rem;
    cursor: pointer;

    .dot {
      position: absolute;
      content: '';
      border-radius: 50%;
      inset: 30%;
    }
  }
</style>
