<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import type { Comment } from '@hcengineering/chunter'
  import type { AttachedData, TxCreateDoc } from '@hcengineering/core'
  import { getClient, MessageViewer } from '@hcengineering/presentation'
  import { AttachmentDocList } from '@hcengineering/attachment-resources'
  import { Button } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { updateBacklinks } from '../../backlinks'
  import chunter from '../../plugin'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'

  export let tx: TxCreateDoc<Comment>
  export let value: Comment
  export let edit: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  const editing = false

  async function onMessage (event: CustomEvent<AttachedData<Comment>>) {
    const { message, attachments } = event.detail
    await client.updateCollection(
      tx.objectClass,
      tx.objectSpace,
      tx.objectId,
      value.attachedTo,
      value.attachedToClass,
      value.collection,
      {
        message,
        attachments
      }
    )
    // We need to update backlinks before and after.
    await updateBacklinks(client, value.attachedTo, value.attachedToClass, value._id, message)

    dispatch('close', false)
  }
  let refInput: AttachmentRefInput
</script>

<div class:editing>
  {#if edit}
    <AttachmentRefInput
      bind:this={refInput}
      _class={value._class}
      objectId={value._id}
      space={value.space}
      content={value.message}
      on:message={onMessage}
      showSend={false}
    />
    <div class="flex-row-reverse gap-2 reverse">
      <Button
        label={chunter.string.EditCancel}
        on:click={() => {
          dispatch('close', false)
        }}
      />
      <Button label={chunter.string.EditUpdate} on:click={() => refInput.submit()} />
    </div>
  {:else}
    <MessageViewer message={value.message} />
    <AttachmentDocList {value} />
  {/if}
</div>

<style lang="scss">
  .editing {
    border: 1px solid var(--primary-button-focused-border);
  }
</style>
