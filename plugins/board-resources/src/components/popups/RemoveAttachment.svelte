<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Label, Button, ActionIcon, IconClose } from '@anticrm/ui'
  import board from '../../plugin'
  import { getClient } from '@anticrm/presentation';
  import { Attachment } from '@anticrm/attachment';

  export let object: Attachment

  const client = getClient()
  const dispatch = createEventDispatcher()
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withTitle antiPopup-withCategory w-85">
  <div class="ap-space"/>
  <div class="flex-row-center header">
    <div class="flex-center flex-grow">
      <Label label={board.string.Delete} />
    </div>
    <div class="close-icon mr-1">
      <ActionIcon icon={IconClose} size={'small'} action={() => {dispatch("close")}} />
    </div>
  </div>
  <div class="ap-space bottom-divider"/>
  <div class="ap-box ml-4 mr-4 mt-4">
    <Label label={board.string.DeleteAttachment}/>
  </div>
  <div class="ap-footer">
    <Button
      size={'small'}
      width="100%"
      label={board.string.Delete}
      kind={'dangerous'}
      on:click={() => {
        client.remove(object)
        dispatch('close')
      }}
    />
  </div>
</div>
