<script lang="ts">
  import { AddAttachment } from '@anticrm/attachment-resources'
  import { Card } from '@anticrm/board'
  import { Button, IconClose, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  import board from '../../plugin'

  export let object: Card

  let inputFile: HTMLInputElement
  let loading: number = 0

  const dispatch = createEventDispatcher()
  function close () {
    dispatch('close')
  }
  function onAttached () {
    if (loading === 0) {
      close()
    }
  }
</script>

<div class="antiPopup w-60 pb-2">
  <div class="relative flex-row-center w-full">
    <div class="flex-center flex-grow fs-title mt-1 mb-1">
      <Label label={board.string.AttachFrom} />
    </div>
    <div class="absolute mr-1 mt-1 mb-1" style:top="0" style:right="0">
      <Button icon={IconClose} kind="transparent" size="small" on:click={close} />
    </div>
  </div>
  <div class="ap-space bottom-divider" />
  <div class="flex-col mt-2 w-full">
    <AddAttachment
      bind:inputFile
      bind:loading
      objectClass={object._class}
      objectId={object._id}
      space={object.space}
      on:attached={onAttached}
    >
      <svelte:fragment slot="control" let:click>
        <Button
          label={board.string.Computer}
          kind="transparent"
          width="100%"
          justify="left"
          on:click={() => {
            click()
          }}
        />
      </svelte:fragment>
    </AddAttachment>
  </div>
  <div class="ap-space bottom-divider mt-3" />
  <div class="mt-1 ml-2 mr-2 text-md"><Label label={board.string.AttachmentTip} /></div>
</div>
