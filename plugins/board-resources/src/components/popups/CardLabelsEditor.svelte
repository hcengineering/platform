<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import { Board, CardLabel } from '@anticrm/board'
  import { Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import {
    Label,
    Button,
    EditBox,
    Icon,
    IconBack,
    IconCheck,
    IconClose,
    LinkWaterColor,
    hexColorToNumber
  } from '@anticrm/ui'

  import board from '../../plugin'
  import { createCardLabel, getBoardAvailableColors } from '../../utils/BoardUtils'
  import ColorPresenter from '../presenters/ColorPresenter.svelte'

  export let object: CardLabel | undefined
  export let boardRef: Ref<Board>
  export let onBack: () => void

  let selected: {
    color?: number
    isHidden?: boolean
  } = { color: object?.color }

  let title = object?.title
  const hiddenColor = hexColorToNumber(LinkWaterColor)
  const client = getClient()
  const dispatch = createEventDispatcher()
  const colorGroups: number[][] = getBoardAvailableColors().reduce(
    (result: number[][], currentValue: string) => {
      const last = result[result.length - 1]
      if (last.length >= 5) {
        result.push([hexColorToNumber(currentValue)])
      } else {
        last.push(hexColorToNumber(currentValue))
      }
      return result
    },
    [[]]
  )

  function selectColor (color: number, isHidden?: boolean) {
    selected = { color, isHidden }
  }

  async function save () {
    const { color, isHidden } = selected
    if (!color) {
      return
    }

    if (object?._id) {
      await client.update(object, {
        color,
        title: title ?? '',
        isHidden: isHidden ?? false
      })
    } else {
      await createCardLabel(client, boardRef, color, title, isHidden)
    }

    onBack()
  }

  async function remove () {
    if (!object?._id) {
      return
    }

    await client.removeDoc(object._class, object.space, object._id)

    onBack()
  }

</script>

<div class="antiPopup w-85">
  <div class="relative fs-title flex-center h-9">
    <div class="absolute flex-center ml-2 h-full" style:top="0" style:left="0">
      <Button icon={IconBack} kind="transparent" size="small" on:click={onBack} />
    </div>
    <div>
      <Label label={board.string.Labels} />
    </div>

    <div class="absolute flex-center mr-2 h-full" style:top="0" style:right="0">
      <Button
        icon={IconClose}
        kind="transparent"
        size="small"
        on:click={() => {
          dispatch('close')
        }} />
    </div>
  </div>
  <div class="ap-space bottom-divider" />
  <div class="flex-col ml-4 mt-4 mr-4 flex-gap-1">
    <div class="text-md font-medium">
      <Label label={board.string.Name} />
    </div>

    <div class="p-2 mt-1 mb-1 border-bg-accent border-radius-1">
      <EditBox bind:value={title} maxWidth="100%" focus={true} />
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
              <ColorPresenter value={color} size="large" on:click={() => selectColor(color)}>
                {#if selected.color === color}
                  <div class="flex-center flex-grow fs-title h-full">
                    <Icon icon={IconCheck} size="small" />
                  </div>
                {/if}
              </ColorPresenter>
            </div>
          {/each}
        </div>
      {/each}
      <div class="flex-row-stretch flex-gap-2">
        <div class="w-14">
          <ColorPresenter value={hiddenColor} size="large" on:click={() => selectColor(hiddenColor, true)}>
            {#if selected.isHidden}
              <div class="flex-center flex-grow fs-title h-full">
                <Icon icon={IconCheck} size="small" />
              </div>
            {/if}
          </ColorPresenter>
        </div>
        <div class="flex-col text-md">
          <div class="fs-bold"><Label label={board.string.NoColor} /></div>
          <div><Label label={board.string.NoColorInfo} /></div>
        </div>
      </div>
    </div>
  </div>
  <div class="ap-footer">
    {#if object?._id}
      <Button size="small" kind="dangerous" label={board.string.Delete} on:click={remove} />
    {/if}
    <Button label={board.string.Save} size="small" kind="primary" on:click={save} disabled={!selected.color} />
  </div>
</div>
