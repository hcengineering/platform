<script lang="ts">
  import { CardCover, Card } from '@anticrm/board'
  import { getClient } from '@anticrm/presentation'
  import { Button, hexColorToNumber, Icon, Label, IconCheck, IconClose } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '../../plugin'
  import { getBoardAvailableColors } from '../../utils/BoardUtils'
  import ColorPresenter from '../presenters/ColorPresenter.svelte'
  export let value: CardCover | undefined | null
  export let object: Card | undefined
  export let onChange: (e: any) => void | undefined

  $: cover = object ? object.cover : value

  const client = getClient()
  const dispatch = createEventDispatcher()

  const colorGroups = (function chunk (colors: number[]): number[][] {
    return colors.length ? [colors.slice(0, 5), ...chunk(colors.slice(5))] : []
  })(getBoardAvailableColors().map(hexColorToNumber))

  function updateCover (newCover?: Partial<CardCover>) {
    cover = newCover ? { size: 'small', color: colorGroups[0][0], ...cover, ...newCover } : null
    if (onChange) onChange(cover)
    else if (object) client.update(object, { cover })
  }
</script>

<div class="antiPopup w-85">
  <div class="ap-space" />
  <div class="flex-center flex-grow fs-title mt-1 mb-1">
    <Label label={board.string.Cover} />
  </div>
  <div class="absolute mr-1 mt-1 mb-1" style:top="0" style:right="0">
    <Button
      icon={IconClose}
      kind="transparent"
      size="small"
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
  <div class="ap-space bottom-divider" />
  <div class="flex" />
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
          updateCover({ size: 'small' })
        }}
      />
      <Button
        icon={board.icon.Board}
        width="40%"
        disabled={!cover || cover.size === 'large'}
        on:click={() => {
          updateCover({ size: 'large' })
        }}
      />
    </div>
    <div class="flex-center">
      <Button
        label={board.string.RemoveCover}
        width="80%"
        on:click={() => {
          updateCover()
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
                  updateCover({ color })
                }}
              >
                {#if cover && cover.color === color}
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
</div>
