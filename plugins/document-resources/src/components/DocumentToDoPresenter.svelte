<script lang="ts">
  import core, { Space } from '@hcengineering/core'
  import document, { Document } from '@hcengineering/document'
  import { createQuery } from '@hcengineering/presentation'
  import { Icon, Label } from '@hcengineering/ui'

  export let value: Document
  export let withoutSpace: boolean

  let space: Space | undefined = undefined

  const query = createQuery()

  $: query.query(core.class.Space, { _id: value.space }, (res) => {
    space = res[0]
  })
</script>

{#if !withoutSpace}
  <div>
    <Label label={document.string.CreateDocument} />
    /
    {space?.name}
  </div>
{/if}
<div class="flex-row-center flex-gap-1">
  <div class="icon">
    <Icon icon={document.icon.DocumentApplication} size={'small'} />
  </div>
  {value.title}
</div>
