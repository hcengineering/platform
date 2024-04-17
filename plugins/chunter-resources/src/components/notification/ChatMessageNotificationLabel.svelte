<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Label } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getDocLinkTitle, ObjectIcon } from '@hcengineering/view-resources'
  import { ChatMessage, ThreadMessage } from '@hcengineering/chunter'
  import contact from '@hcengineering/contact'

  import chunter from '../../plugin'
  import ChatMessagePreview from '../chat-message/ChatMessagePreview.svelte'
  import ThreadMessagePreview from '../threads/ThreadMessagePreview.svelte'

  export let context: DocNotifyContext

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let title: string | undefined = undefined
  let parentMessage: ChatMessage | undefined = undefined
  let object: Doc | undefined = undefined

  $: isThread = hierarchy.isDerived(context.attachedToClass, chunter.class.ThreadMessage)

  $: void client
    .findOne(context.attachedToClass as Ref<Class<ChatMessage>>, { _id: context.attachedTo as Ref<ChatMessage> })
    .then((res) => {
      parentMessage = res
    })

  $: loadObject(parentMessage, isThread)
  $: object &&
    getDocLinkTitle(client, object._id, object._class, object).then((res) => {
      title = res
    })

  function loadObject (parentMessage: ChatMessage | undefined, isThread: boolean): void {
    if (parentMessage === undefined) {
      object = undefined
      return
    }

    const _class = isThread ? (parentMessage as ThreadMessage).objectClass : parentMessage.attachedToClass
    const _id = isThread ? (parentMessage as ThreadMessage).objectId : parentMessage.attachedTo

    void client.findOne(_class, { _id }).then((res) => {
      object = res
    })
  }

  function toThread (message: ChatMessage): ThreadMessage {
    return message as ThreadMessage
  }
</script>

{#if parentMessage}
  <span class="flex-presenter flex-gap-1 font-semi-bold">
    {#if isThread || (parentMessage.replies ?? 0) > 0}
      <Label label={chunter.string.Thread} />
    {:else}
      <Label label={chunter.string.Message} />
    {/if}
    {#if title}
      <span class="lower">
        <Label label={chunter.string.In} />
      </span>
      <span class="flex-presenter flex-gap-0-5">
        {#if object}
          <ObjectIcon
            value={object}
            size={hierarchy.isDerived(object._class, contact.class.Person) ? 'tiny' : 'small'}
          />
        {/if}
        <div class="overflow-label">
          {title}
        </div>
      </span>
    {/if}
  </span>
  <span class="font-normal">
    {#if isThread}
      <ThreadMessagePreview value={toThread(parentMessage)} readonly type="content-only" />
    {:else}
      <ChatMessagePreview value={parentMessage} readonly type="content-only" />
    {/if}
  </span>
{/if}
