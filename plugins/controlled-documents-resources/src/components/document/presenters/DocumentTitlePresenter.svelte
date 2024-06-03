<script lang="ts">
  import documents, { Document } from '@hcengineering/controlled-documents'
  import { Ref } from '@hcengineering/core'

  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let value: Ref<Document> | undefined

  let document: Document | undefined = undefined
  const client = getClient()

  $: if (value) {
    client.findOne(documents.class.Document, { _id: value }).then((result) => {
      document = result
    })
  }
</script>

{#if document}
  {document.title}
{:else}
  <Label label={view.string.LabelNA} />
{/if}
