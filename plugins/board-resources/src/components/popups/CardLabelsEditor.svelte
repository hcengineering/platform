<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import { getClient } from '@anticrm/presentation'
  import { Label, Button, EditBox, Icon, IconBack, IconCheck, IconClose, hexColorToNumber } from '@anticrm/ui'

  import board from '../../plugin'
  import { createCardLabel, getBoardAvailableColors } from '../../utils/BoardUtils'
  import ColorPresenter from '../presenters/ColorPresenter.svelte'
  import { TagElement } from '@anticrm/tags'

  export let object: TagElement | undefined
  export let onBack: () => void

  let { title, color } = object ?? {}
  const client = getClient()
  const dispatch = createEventDispatcher()
  const colorGroups = (function chunk (colors: number[]): number[][] {
    return colors.length ? [colors.slice(0, 5), ...chunk(colors.slice(5))] : []
  })(getBoardAvailableColors().map(hexColorToNumber))

  async function save () {
    if (!title || !color) {
      return
    }
    if (object) {
      await client.update(object, { title, color })
    } else {
      await createCardLabel(client, { title, color })
    }
    onBack()
  }

  async function remove () {
    if (!object) return
    await client.remove(object)
    onBack()
  }
</script>

<div class="antiPopup w-85">
  <div class="relative flex-row-center w-full ">
    <div class="absolute ml-1 mt-1 mb-1" style:top="0" style:left="0">
      <Button icon={IconBack} kind="transparent" size="small" on:click={onBack} />
    </div>
    <div class="flex-center flex-grow fs-title mt-1 mb-1">
      <Label label={board.string.Labels} />
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
          {#each colorGroup as c}
            <div class="w-14">
              <ColorPresenter
                value={c}
                size="large"
                on:click={() => {
                  color = c
                }}
              >
                {#if c === color}
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
  <div class="ap-footer">
    {#if object}
      <Button size="small" kind="dangerous" label={board.string.Delete} on:click={remove} />
    {/if}
    <Button label={board.string.Save} size="small" kind="primary" on:click={save} disabled={!color || !title} />
  </div>
</div>
