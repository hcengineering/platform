<script lang="ts">
  import core, { Doc, DocIndexState, Ref } from '@hcengineering/core'

  import { EditBox, Label, Panel } from '@hcengineering/ui'
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
    <EditBox autoFocus bind:value={search} kind="search-style" />
  </div>
  <div class="indexed-background">
    <div class="indexed-doc text-base max-h-125">
      {#if indexDoc}
        <IndexedDocumentContent {indexDoc} {search} />
      {/if}
    </div>
  </div>
{:else}
  <Panel on:changeContent on:close>
    <EditBox autoFocus bind:value={search} kind="search-style" />
    <div class="indexed-background">
      <div class="indexed-doc text-base max-h-125">
        {#if indexDoc}
          <IndexedDocumentContent {indexDoc} {search} />
        {/if}
      </div>
    </div>
  </Panel>
{/if}

<style lang="scss">
  .indexed-doc {
    padding: 2.5rem;
    display: grid;
    overflow: auto;
    min-width: 50rem;
    max-width: 80rem;
  }
  .indexed-background {
    background-color: white;
    color: black;
    user-select: text;
  }
</style>
