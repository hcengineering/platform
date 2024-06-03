<script lang="ts">
  import documents, { DocumentCategory } from '@hcengineering/controlled-documents'
  import { Ref } from '@hcengineering/core'

  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let value: Ref<DocumentCategory> | undefined

  let category: DocumentCategory | undefined = undefined
  const client = getClient()

  $: if (value) {
    client.findOne(documents.class.DocumentCategory, { _id: value }).then((result) => {
      category = result
    })
  }
</script>

{#if category}
  {category.title}
{:else}
  <Label label={view.string.LabelNA} />
{/if}
