<script lang="ts">
  import { Class, Doc, Ref, Space } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { CircleButton, IconAdd } from '@anticrm/ui'
  import { createAttachment } from '../utils'

  export let loading: number = 0
  export let inputFile: HTMLInputElement

  export let objectClass: Ref<Class<Doc>>
  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  

  const client = getClient()

  function fileSelected() {
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) createAttachment(client, file, loading, { objectClass, objectId, space })
    }
  }

  function openFile() {
    inputFile.click()
  }

</script>

<div>
  {#if $$slots.control}
    <slot name="control" click={openFile}/>
  {:else}
    <CircleButton
      icon={IconAdd}
      size="small"
      selected
      on:click={openFile} />
  {/if}
  <input
    bind:this={inputFile}
    multiple
    type="file"
    name="file"
    id="file"
    style="display: none"
    on:change={fileSelected} />
</div>
