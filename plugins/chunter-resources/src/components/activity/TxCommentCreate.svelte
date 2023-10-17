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
  import chunter from '../../plugin'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { LinkPresenter } from '@hcengineering/view-resources'

  export let tx: TxCreateDoc<Comment>
  export let value: Comment
  export let edit: boolean = false
  export let boundary: HTMLElement | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const editing = false

  async function onMessage (event: CustomEvent<AttachedData<Comment>>) {
    loading = true
    try {
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
    } finally {
      loading = false
    }
    dispatch('close', false)
  }
  let refInput: AttachmentRefInput
  let loading = false

  $: links = getLinks(value.message)

  function getLinks (content: string): HTMLLinkElement[] {
    const parser = new DOMParser()
    const parent = parser.parseFromString(content, 'text/html').firstChild?.childNodes[1] as HTMLElement
    return parseLinks(parent.childNodes)
  }

  function parseLinks (nodes: NodeListOf<ChildNode>): HTMLLinkElement[] {
    const res: HTMLLinkElement[] = []
    nodes.forEach((p) => {
      if (p.nodeType !== Node.TEXT_NODE) {
        if (p.nodeName === 'A') {
          res.push(p as HTMLLinkElement)
        }
        res.push(...parseLinks(p.childNodes))
      }
    })
    return res
  }
</script>

<div class:editing class="content-color">
  {#if edit}
    <AttachmentRefInput
      bind:loading
      bind:this={refInput}
      _class={value._class}
      objectId={value._id}
      space={value.space}
      content={value.message}
      on:message={onMessage}
      showSend={false}
      {boundary}
    />
    <div class="flex-row-center gap-2 justify-end mt-2">
      <Button
        label={chunter.string.EditCancel}
        on:click={() => {
          dispatch('close', false)
        }}
      />
      <Button label={chunter.string.EditUpdate} accent on:click={() => refInput.submit()} />
    </div>
  {:else}
    <MessageViewer message={value.message} />
    <AttachmentDocList {value} />
    {#each links as link}
      <LinkPresenter {link} />
    {/each}
  {/if}
</div>

<style lang="scss">
  .editing {
    border: 1px solid var(--accented-button-outline);
  }
</style>
