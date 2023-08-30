<script lang="ts">
  import { DocIndexState } from '@hcengineering/core'
  import { EditBox, Dialog } from '@hcengineering/ui'
  import IndexedDocumentContent from './IndexedDocumentContent.svelte'

  export let left: DocIndexState
  export let right: DocIndexState | undefined

  let search: string = ''
</script>

<Dialog isFullSize on:changeContent on:close on:fullsize>
  <EditBox autoFocus bind:value={search} kind={'default-large'} fullSize />
  <div class="flex-row-top px-3 mt-4 text-base">
    <div class="indexed-doc-part flex-col">
      <IndexedDocumentContent indexDoc={left} {search} />
    </div>
    {#if right !== undefined}
      <div class="indexed-doc-part flex-col ml-4">
        <IndexedDocumentContent indexDoc={right} {search} />
      </div>
    {/if}
  </div>
</Dialog>

<style lang="scss">
  .indexed-doc-part {
    overflow: auto;
    flex-basis: 100%;
    height: fit-content;
    max-height: 100%;
  }
</style>
