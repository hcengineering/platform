<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import chunter, { type ChatMessage } from '@hcengineering/chunter'
  import { Ref, generateId } from '@hcengineering/core'
  import { ReferenceInput } from '@hcengineering/text-editor-resources'
  import { popupstore as popups } from '@hcengineering/ui'

  import { addDocumentCommentFx } from '../../../stores/editors/document'

  export let nodeId: string | undefined
  export let popupId: string | undefined

  const dispatch = createEventDispatcher()

  async function handleMessage (event: CustomEvent<string>): Promise<void> {
    const messageId: Ref<ChatMessage> = generateId()
    const comment = await addDocumentCommentFx({ content: event.detail, messageId, nodeId })

    dispatch('close', comment)
  }

  let popup: HTMLDivElement | undefined

  function isClickInsidePopup (target: Node): boolean {
    if (popup !== undefined && popup.contains(target)) return true
    if (!(target instanceof Element)) return false

    if (target.closest('.tippy-box') !== null) return true
    if (target.closest('[data-block-editor-blur="true"]') !== null) return true

    return false
  }

  function handleClick (event: MouseEvent): void {
    if (event.target instanceof Node) {
      const top = $popups.length > 0 && $popups[$popups.length - 1].id === popupId
      if (top && !isClickInsidePopup(event.target)) {
        event.preventDefault()
        event.stopPropagation()
        dispatch('close', undefined)
      }
    }
  }
</script>

<svelte:window on:click|capture={handleClick} />

<div class="text-editor-popup w-85" bind:this={popup}>
  <ReferenceInput
    autofocus
    focusable
    kindSend="primary"
    placeholder={chunter.string.AddCommentPlaceholder}
    on:message={handleMessage}
  />
</div>
