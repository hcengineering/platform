<script lang="ts">
  import { CardCover, Card } from '@hcengineering/board'
  import presentation, { Card as Popup, getClient } from '@hcengineering/presentation'
  import { Button, hexColorToNumber, Icon, Label, IconCheck } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '../../plugin'
  import { getBoardAvailableColors } from '../../utils/BoardUtils'
  import ColorPresenter from '../presenters/ColorPresenter.svelte'
  export let value: CardCover | undefined | null
  export let object: Card | undefined
  export let onChange: (e: any) => void | undefined

  let cover = object ? object.cover : value
  let coverColor = cover?.color
  let coverSize = cover?.size ?? 'small'

  const client = getClient()
  const dispatch = createEventDispatcher()

  const colorGroups = (function chunk (colors: number[]): number[][] {
    return colors.length ? [colors.slice(0, 5), ...chunk(colors.slice(5))] : []
  })(getBoardAvailableColors().map(hexColorToNumber))

  function close () {
    dispatch('close')
  }
  function updateCover () {
    if (!coverColor) {
      return
    }
    const newCover = { color: coverColor, size: coverSize }
    if (onChange) onChange(newCover)
    if (object) client.update(object, { cover: newCover })
  }

  function removeCover () {
    cover = null
    if (onChange) onChange(cover)
    else if (object) client.update(object, { cover })
  }
</script>

<Popup
  label={board.string.Cover}
  canSave={cover ? coverColor !== cover.color || coverSize !== cover.size : !!coverColor}
  okAction={updateCover}
  okLabel={presentation.string.Save}
  on:close={close}
>
  <div class="flex-col ml-4 mt-4 mb-4 mr-4 flex-gap-1">
    <div class="text-md font-medium">
      <Label label={board.string.Size} />
    </div>
    <div class="flex-center mt-1 mb-1 flex-gap-2">
      <!-- TODO: replace with actual buttons -->
      <Button
        icon={board.icon.Card}
        width="40%"
        disabled={!cover || cover.size === 'small'}
        on:click={() => {
          coverSize = 'small'
        }}
      />
      <Button
        icon={board.icon.Board}
        width="40%"
        disabled={!cover || cover.size === 'large'}
        on:click={() => {
          coverSize = 'large'
        }}
      />
    </div>
  </div>
  <div class="flex-col ml-4 mt-4 mb-4 mr-4 flex-gap-1">
    <div class="text-md font-medium">
      <Label label={board.string.SelectColor} />
    </div>
    <div class="flex-col mt-1 mb-1 flex-gap-2">
      {#each colorGroups as colorGroup}
        <div class="flex-row-stretch flex-gap-2">
          {#each colorGroup as color}
            <div class="w-14">
              <ColorPresenter
                value={color}
                size="large"
                on:click={() => {
                  coverColor = color
                }}
              >
                {#if coverColor === color}
                  <div class="flex-center flex-grow fs-title h-full">
                    <Icon icon={IconCheck} size="small" />
                  </div>
                {/if}
              </ColorPresenter>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
  <svelte:fragment slot="buttons">
    <Button label={board.string.RemoveCover} kind="ghost" on:click={removeCover} />
  </svelte:fragment>
</Popup>
