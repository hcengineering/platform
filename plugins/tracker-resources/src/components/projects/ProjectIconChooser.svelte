<script lang="ts">
  import { Metadata } from '@hcengineering/platform'
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
  import { ColorsPopup } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  export let icon: Metadata<string> | undefined = undefined
  export let color: number = 0

  const dispatch = createEventDispatcher()
  const icons = [tracker.icon.Home, tracker.icon.RedCircle]

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
  label={tracker.string.ChooseIcon}
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
    <TabsControl
      model={[{ label: tracker.string.ProjectIconCategory }, { label: tracker.string.ProjectEmojiCategory }]}
    >
      <svelte:fragment slot="content" let:selected>
        {#if selected === 0}
          <div class="flex-row-center">
            <Label label={tracker.string.ProjectColor} />
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
              dispatch('close', { icon: tracker.component.IconWithEmoji, color: evt.detail.codePointAt(0) })
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
