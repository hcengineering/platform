<script lang="ts">
  // Copyright © 2026 Krang / Subfracture
  // Message List - Display conversation history

  import { Label } from '@hcengineering/ui'
  import type { AgentMessage } from '@hcengineering/ai-agent'
  import aiAgent from '@hcengineering/ai-agent'

  export let messages: AgentMessage[] = []
  export let isThinking = false
</script>

<div class="message-list">
  {#if messages.length === 0 && !isThinking}
    <div class="empty-state">
      <span class="empty-icon">💭</span>
      <span class="empty-text">
        <Label label={aiAgent.string.AskAgent} />
      </span>
    </div>
  {:else}
    {#each messages as message (message.id)}
      <div class="message" class:user={message.role === 'user'} class:agent={message.role === 'agent'}>
        <div class="message-content">
          {message.content}
        </div>
        <div class="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    {/each}

    {#if isThinking}
      <div class="message agent thinking">
        <div class="thinking-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .message-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: var(--theme-caption-color);
  }

  .empty-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .empty-text {
    font-size: 0.875rem;
  }

  .message {
    padding: 0.625rem 0.75rem;
    border-radius: 0.75rem;
    max-width: 85%;

    &.user {
      align-self: flex-end;
      background: var(--theme-button-pressed);
      border-bottom-right-radius: 0.25rem;
    }

    &.agent {
      align-self: flex-start;
      background: var(--theme-bg-accent-color);
      border-bottom-left-radius: 0.25rem;
    }
  }

  .message-content {
    font-size: 0.8125rem;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  .message-time {
    font-size: 0.625rem;
    color: var(--theme-caption-color);
    margin-top: 0.25rem;
  }

  .thinking-indicator {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem 0;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--theme-caption-color);
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
</style>
