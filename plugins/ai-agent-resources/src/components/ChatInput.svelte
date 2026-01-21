<script lang="ts">
  // Copyright © 2026 Krang / Subfracture
  // Chat Input - Send messages to agent

  import { createEventDispatcher } from 'svelte'
  import { Label } from '@hcengineering/ui'
  import aiAgent from '@hcengineering/ai-agent'

  export let disabled = false

  let inputValue = ''
  let inputElement: HTMLTextAreaElement

  const dispatch = createEventDispatcher<{ send: string }>()

  function handleSubmit() {
    if (!inputValue.trim() || disabled) return
    dispatch('send', inputValue.trim())
    inputValue = ''
    if (inputElement) {
      inputElement.style.height = 'auto'
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  function autoResize() {
    if (inputElement) {
      inputElement.style.height = 'auto'
      inputElement.style.height = Math.min(inputElement.scrollHeight, 120) + 'px'
    }
  }
</script>

<div class="chat-input" class:disabled>
  <textarea
    bind:this={inputElement}
    bind:value={inputValue}
    on:keydown={handleKeydown}
    on:input={autoResize}
    placeholder="Ask the agent..."
    rows="1"
    {disabled}
  ></textarea>
  <button
    class="send-button"
    on:click={handleSubmit}
    disabled={disabled || !inputValue.trim()}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>
  </button>
</div>

<style lang="scss">
  .chat-input {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;

    &.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  textarea {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    background: var(--theme-bg-color);
    color: var(--theme-content-color);
    font-size: 0.8125rem;
    font-family: inherit;
    resize: none;
    min-height: 36px;
    max-height: 120px;
    line-height: 1.4;

    &:focus {
      outline: none;
      border-color: var(--theme-button-pressed);
    }

    &::placeholder {
      color: var(--theme-caption-color);
    }
  }

  .send-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 0.5rem;
    background: var(--theme-button-pressed);
    color: var(--theme-content-color);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: var(--theme-button-hovered);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
