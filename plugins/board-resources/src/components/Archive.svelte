<script lang="ts">
  import { Ref, Space } from '@hcengineering/core'
  import { Button, TextArea } from '@hcengineering/ui'
  import board from '../plugin'
  import CardsArchive from './CardArchive.svelte'
  import ListArchive from './ListArchive.svelte'

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
