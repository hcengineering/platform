<script lang="ts">
  import { Class, Doc, Ref, Space } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { CircleButton, IconAdd } from '@anticrm/ui'
  import { createAttachments } from '../utils'

  export let loading: number = 0
  export let inputFile: HTMLInputElement

  export let objectClass: Ref<Class<Doc>>
  export let objectId: Ref<Doc>
  export let space: Ref<Space>

  const client = getClient()

  async function fileSelected() {
    const list = inputFile.files
    if (list === null || list.length === 0) return

    loading++
    try {
      await createAttachments(client, list, { objectClass, objectId, space })
    } finally {
      loading--
    }
  }

  function openFile() {
    inputFile.click()
  }
</script>

<div>
  {#if $$slots.control}
    <slot name="control" click={openFile} />
  {:else}
    <CircleButton icon={IconAdd} size="small" selected on:click={openFile} />
  {/if}
  <input
    bind:this={inputFile}
    multiple
    type="file"
    name="file"
    id="file"
    style="display: none"
    on:change={fileSelected}
  />
</div>
