<script lang="ts">
  import { $groupedDocumentComments as groupedDocumentComments } from '../../../stores/editors/document'
  import DocumentCommentThread from '../right-panel/DocumentCommentThread.svelte'

  export let sectionKey: string
  export let nodeId: string | undefined

  $: documentComments = $groupedDocumentComments.getDocumentComments(sectionKey, nodeId)
</script>

<div class="text-editor-popup max-h-80 min-w-100 overflow-y-auto">
  {#each documentComments as object}
    <DocumentCommentThread value={object} />
  {/each}
</div>
