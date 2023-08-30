<script lang="ts">
  import core, { Doc, DocIndexState, Ref } from '@hcengineering/core'

  import { EditBox, Label, Dialog } from '@hcengineering/ui'
  import { createQuery } from '../utils'
  import IndexedDocumentContent from './IndexedDocumentContent.svelte'
  import presentation from '../plugin'

  export let objectId: Ref<Doc> | undefined
  export let indexDoc: DocIndexState | undefined = undefined
  export let search: string = ''
  export let noPanel = false

  const indexDocQuery = createQuery()
  $: if (objectId !== undefined) {
    indexDocQuery.query(core.class.DocIndexState, { _id: objectId as Ref<DocIndexState> }, (res) => {
      console.log(res)
      indexDoc = res.shift()
    })
  } else {
    indexDocQuery.unsubscribe()
  }
</script>

{#if noPanel}
  <div class="p-1 flex-col">
    <Label label={presentation.string.DocumentPreview} />
    <EditBox autoFocus bind:value={search} kind={'default-large'} fullSize />
  </div>
  <div class="indexed-doc flex-col px-3 mt-4 text-base">
    {#if indexDoc}
      <IndexedDocumentContent {indexDoc} {search} />
    {/if}
  </div>
{:else}
  <Dialog isFullSize on:changeContent on:close on:fullsize>
    <EditBox autoFocus bind:value={search} kind={'default-large'} fullSize />
    <div class="indexed-doc flex-col px-3 mt-4 text-base">
      {#if indexDoc}
        <IndexedDocumentContent {indexDoc} {search} />
      {/if}
    </div>
  </Dialog>
{/if}

<style lang="scss">
  .indexed-doc {
    overflow: auto;
    flex-basis: 100%;
    height: fit-content;
    max-height: 100%;
  }
</style>
