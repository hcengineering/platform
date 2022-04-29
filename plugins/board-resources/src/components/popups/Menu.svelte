<script lang="ts">
  import { Ref, Space } from '@anticrm/core'
  import { ActionIcon, Button, IconClose, Label } from '@anticrm/ui'
  import TextArea from '@anticrm/ui/src/components/TextArea.svelte'
  import { createEventDispatcher } from 'svelte'
  import board from '../../plugin'
  import CardsArchive from '../CardArchive.svelte'
  import ListArchive from '../ListArchive.svelte'

  export let space: Ref<Space>
  const dispatch = createEventDispatcher()

  let isCardArchive = true
  let search: string = ''
  $: query = { space, title: { $like: '%' + search + '%' } }
  $: label = isCardArchive ? board.string.SwitchToLists : board.string.SwitchToCards
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withCategory w-60">
  <div class="ap-space" />
  <div class="flex-row-center header">
    <div class="flex-center flex-grow">
      <Label label={board.string.Archive} />
    </div>
    <div class="close-icon mr-1">
      <ActionIcon
        icon={IconClose}
        size={'small'}
        action={() => {
          dispatch('close')
        }}
      />
    </div>
  </div>
  <div class="ap-space bottom-divider" />
  <div class="ap-scroll">
    <div class="p-4">
      <Button
        {label}
        width={'100%'}
        on:click={() => {
          isCardArchive = !isCardArchive
        }}
      />
      <div class="pt-4">
        <TextArea bind:value={search} placeholder={board.string.SearchArchive} />
      </div>
    </div>
    {#if isCardArchive}
      <CardsArchive {query} />
    {:else}
      <ListArchive {query} />
    {/if}
  </div>
</div>
