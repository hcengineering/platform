<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Label, Button, ActionIcon, IconClose, EditBox } from '@anticrm/ui'
  import board from '../../plugin'
  import { getClient } from '@anticrm/presentation'
  import { Attachment } from '@anticrm/attachment'

  export let object: Attachment

  let { name } = object

  const client = getClient()
  const dispatch = createEventDispatcher()
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withCategory w-85">
  <div class="ap-space"/>
  <div class="flex-row-center header">
    <div class="flex-center flex-grow">
      <Label label={board.string.Edit}/>
    </div>
    <div class="close-icon mr-1">
      <ActionIcon icon={IconClose} size={'small'} action={() => { dispatch('close') }} />
    </div>
  </div>
  <div class="ap-space bottom-divider"/>
  <div class="ap-category">
    <div class="ap-categoryItem">
      <EditBox bind:value={name} maxWidth="18rem" label={board.string.LinkName} placeholder={board.string.LinkName}/>
    </div>
  </div>
  <div class="ap-footer">
    <Button
      size={'small'}
      label={board.string.Update}
      kind={'primary'}
      on:click={() => {
        if (!name) return
        client.update(object, { name })
        dispatch('close')
      }}
    />
  </div>
</div>
