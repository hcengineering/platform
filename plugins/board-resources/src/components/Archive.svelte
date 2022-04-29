<script lang="ts">
  import { Ref, Space } from '@anticrm/core'
  import { Button } from '@anticrm/ui'
  import board from '../plugin'
  import CardsArchive from './CardArchive.svelte'
  import ListArchive from './ListArchive.svelte'
  import TextArea from '@anticrm/ui/src/components/TextArea.svelte'

  export let space: Ref<Space>

  let isCardArchive = true
  let search: string = ''
  $: query = { space, title: { $like: '%' + search + '%' } }
  $: label = isCardArchive ? board.string.SwitchToLists : board.string.SwitchToCards
</script>

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
