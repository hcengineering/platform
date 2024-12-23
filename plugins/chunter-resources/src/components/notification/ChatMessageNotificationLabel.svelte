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
  import { Label, tooltip } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getDocLinkTitle, getDocTitle, ObjectIcon } from '@hcengineering/view-resources'
  import { ChatMessage, ThreadMessage } from '@hcengineering/chunter'
  import contact from '@hcengineering/contact'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  import chunter from '../../plugin'
  import ChatMessagePreview from '../chat-message/ChatMessagePreview.svelte'
  import ThreadMessagePreview from '../threads/ThreadMessagePreview.svelte'

  export let context: DocNotifyContext
  export let object: ChatMessage

  let title: string | undefined = undefined
  let channel: Doc | undefined = undefined

  $: isThread = getClient().getHierarchy().isDerived(context.objectClass, chunter.class.ThreadMessage)

  $: loadChannel(object, isThread)
  $: channel &&
    getDocLinkTitle(getClient(), channel._id, channel._class, channel).then((res) => {
      title = res
    })

  function loadChannel (object: ChatMessage, isThread: boolean): void {
    const _class = isThread ? (object as ThreadMessage).objectClass : object.attachedToClass
    const _id = isThread ? (object as ThreadMessage).objectId : object.attachedTo

    void getClient()
      .findOne(_class, { _id, ...(isThread ? { space: object.space } : {}) })
      .then((res) => {
        channel = res
      })
  }

  function toThread (message: ChatMessage): ThreadMessage {
    return message as ThreadMessage
  }

  function isAvatarIcon (_class: Ref<Class<Doc>>): boolean {
    const hierarchy = getClient().getHierarchy()
    return hierarchy.isDerived(_class, contact.class.Person) || hierarchy.isDerived(_class, chunter.class.DirectMessage)
  }
</script>

<span class="flex-presenter flex-gap-1 font-semi-bold">
  {#if isThread || (object.replies ?? 0) > 0}
    <Label label={chunter.string.Thread} />
  {:else}
    <Label label={chunter.string.Message} />
  {/if}
  {#if title && channel}
    <span class="lower">
      <Label label={chunter.string.In} />
    </span>
    {#await getDocTitle(getClient(), channel._id, channel._class, channel) then tooltipLabel}
      <span
        class="flex-presenter flex-gap-0-5"
        use:tooltip={tooltipLabel ? { label: getEmbeddedLabel(tooltipLabel) } : undefined}
      >
        <ObjectIcon value={channel} size={isAvatarIcon(channel._class) ? 'tiny' : 'small'} />
        <span class="overflow-label">
          {title}
        </span>
      </span>
    {/await}
  {/if}
</span>
<span class="font-normal">
  {#if isThread}
    <ThreadMessagePreview value={toThread(object)} readonly type="content-only" />
  {:else}
    <ChatMessagePreview value={object} readonly type="content-only" />
  {/if}
</span>
