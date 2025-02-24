<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import chunter, { type ChatMessage } from '@hcengineering/chunter'
  import { Ref, generateId } from '@hcengineering/core'
  import { ReferenceInput } from '@hcengineering/text-editor-resources'

  import { addDocumentCommentFx } from '../../../stores/editors/document'

  export let nodeId: string | undefined

  const dispatch = createEventDispatcher()

  let messageId: Ref<ChatMessage> = generateId()

  async function handleMessage (event: CustomEvent<string>): Promise<void> {
    const comment = await addDocumentCommentFx({ content: event.detail, messageId, nodeId })
    messageId = generateId()

    dispatch('close', comment)
  }
</script>

<div class="text-editor-popup w-85">
  <ReferenceInput
    focusable
    kindSend="primary"
    placeholder={chunter.string.AddCommentPlaceholder}
    on:message={handleMessage}
  />
</div>
