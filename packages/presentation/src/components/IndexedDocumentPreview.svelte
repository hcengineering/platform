<script lang="ts">
  import core, { Doc, DocIndexState, Ref } from '@hcengineering/core'

  import { EditBox, Panel } from '@hcengineering/ui'
  import { createQuery } from '../utils'
  import IndexedDocumentContent from './IndexedDocumentContent.svelte'

  export let objectId: Ref<Doc> | undefined
  export let indexDoc: DocIndexState | undefined = undefined
  export let search: string = ''

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

<Panel on:changeContent on:close>
  <EditBox focus bind:value={search} kind="search-style" />
  <div class="indexed-background">
    <div class="indexed-doc text-base max-h-125">
      {#if indexDoc}
        <IndexedDocumentContent {indexDoc} {search} />
      {/if}
    </div>
  </div>
</Panel>

<style lang="scss">
  .indexed-doc {
    padding: 2.5rem;
    display: grid;
    overflow: auto;
    min-width: 50rem;
    max-width: 200rem;
  }
  .indexed-background {
    background-color: white;
    color: black;
    user-select: text;
  }
</style>
