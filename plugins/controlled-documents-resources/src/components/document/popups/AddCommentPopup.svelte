<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import chunter, { type ChatMessage } from '@hcengineering/chunter'
  import { Ref, generateId } from '@hcengineering/core'
  import { ReferenceInput } from '@hcengineering/text-editor'

  import {
    addDocumentCommentFx,
    $controlledDocumentSections as controlledDocumentSections
  } from '../../../stores/editors/document'

  export let sectionKey: string
  export let nodeId: string | undefined

  const dispatch = createEventDispatcher()

  let messageId: Ref<ChatMessage> = generateId()

  $: section = $controlledDocumentSections.find((section) => section.key === sectionKey)

  async function handleMessage (event: CustomEvent<string>): Promise<void> {
    const comment = await addDocumentCommentFx({ content: event.detail, section, messageId, nodeId })
    messageId = generateId()

    dispatch('close', comment)
  }
</script>

{#if section}
  <div class="text-editor-popup w-85">
    <ReferenceInput
      focusable
      kindSend="primary"
      placeholder={chunter.string.AddCommentPlaceholder}
      on:message={handleMessage}
    />
  </div>
{/if}
