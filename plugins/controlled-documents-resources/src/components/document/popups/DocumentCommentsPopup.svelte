<script lang="ts">
  import { $documentComments as documentComments } from '../../../stores/editors/document'
  import DocumentCommentThread from '../right-panel/DocumentCommentThread.svelte'

  export let nodeId: string | undefined

  $: commentsForNode = $documentComments.filter((c) => c.nodeId === nodeId)
</script>

<div class="text-editor-popup max-h-80 min-w-100 overflow-y-auto">
  {#each commentsForNode as object}
    <DocumentCommentThread value={object} />
  {/each}
</div>
