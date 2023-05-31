<script lang="ts">
  import { DocIndexState } from '@hcengineering/core'

  import { EditBox, Panel } from '@hcengineering/ui'
  import IndexedDocumentContent from './IndexedDocumentContent.svelte'

  export let left: DocIndexState
  export let right: DocIndexState | undefined

  let search: string = ''
</script>

<Panel on:changeContent on:close>
  <EditBox autoFocus bind:value={search} kind="search-style" />
  <div class="indexed-background">
    <div class="indexed-doc text-base max-h-125">
      <div class="flex">
        <div class="indexed-doc-part">
          <IndexedDocumentContent indexDoc={left} {search} />
        </div>
        {#if right !== undefined}
          <div class="indexed-doc-part">
            <IndexedDocumentContent indexDoc={right} {search} />
          </div>
        {/if}
      </div>
    </div>
  </div>
</Panel>

<style lang="scss">
  .indexed-doc {
    padding: 2.5rem;
    display: flex;
    overflow: auto;
    min-width: 50rem;
    max-width: 100rem;
  }
  .indexed-doc-part {
    padding: 0.5rem;
    display: grid;
    overflow: auto;
    min-width: 25rem;
    max-width: 50rem;
  }
  .indexed-background {
    background-color: white;
    color: black;
    user-select: text;
    // width: 200rem;
    .highlight {
      color: blue;
    }
  }
</style>
