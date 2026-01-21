<script lang="ts">
  // Copyright © 2026 Krang / Subfracture
  // Agent Widget - Main sidebar component

  import { onMount, onDestroy } from 'svelte'
  import { Label, Scroller } from '@hcengineering/ui'
  import { location, panelstore } from '@hcengineering/ui'
  import type { AgentMode, AgentMessage } from '@hcengineering/ai-agent'
  import aiAgent from '@hcengineering/ai-agent'

  import ModeSelector from './ModeSelector.svelte'
  import MessageList from './MessageList.svelte'
  import ChatInput from './ChatInput.svelte'

  // Reactive context from Huly
  $: currentObject = $panelstore.panel
  $: currentPath = $location.path

  // Agent state
  let mode: AgentMode = 'watching'
  let messages: AgentMessage[] = []
  let connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected'
  let isThinking = false

  // Context tracking
  $: context = {
    app: currentPath[0] ?? 'unknown',
    workspace: currentPath[1] ?? '',
    space: currentPath[3] ?? '',
    objectId: currentObject?._id,
    objectClass: currentObject?._class
  }

  // Handle mode change
  function handleModeChange(event: CustomEvent<AgentMode>) {
    mode = event.detail
    // TODO: Send mode change to agent backend
  }

  // Handle message send
  async function handleSend(event: CustomEvent<string>) {
    const content = event.detail
    if (!content.trim()) return

    // Add user message
    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now()
    }
    messages = [...messages, userMessage]

    // Simulate agent response (TODO: Replace with ACP)
    isThinking = true
    await new Promise(resolve => setTimeout(resolve, 1000))

    const agentMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      content: `I received your message: "${content}"\n\nCurrent context:\n- App: ${context.app}\n- Object: ${context.objectId ?? 'none'}`,
      timestamp: Date.now()
    }
    messages = [...messages, agentMessage]
    isThinking = false
  }

  onMount(() => {
    // TODO: Initialize ACP connection
    connectionStatus = 'connected'
  })

  onDestroy(() => {
    // TODO: Cleanup ACP connection
  })
</script>

<div class="agent-widget">
  <div class="agent-header">
    <div class="header-title">
      <Label label={aiAgent.string.Agent} />
    </div>
    <div class="header-status" class:connected={connectionStatus === 'connected'}>
      <span class="status-dot"></span>
    </div>
  </div>

  <div class="agent-mode">
    <ModeSelector bind:mode on:change={handleModeChange} />
  </div>

  {#if context.objectId}
    <div class="agent-context">
      <span class="context-label">Viewing:</span>
      <span class="context-value">{context.objectClass?.split('.').pop() ?? 'Document'}</span>
    </div>
  {/if}

  <Scroller>
    <div class="agent-messages">
      <MessageList {messages} {isThinking} />
    </div>
  </Scroller>

  <div class="agent-input">
    <ChatInput on:send={handleSend} disabled={connectionStatus !== 'connected'} />
  </div>
</div>

<style lang="scss">
  .agent-widget {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .agent-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }

  .header-title {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .header-status {
    display: flex;
    align-items: center;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--theme-error-color);
    transition: background-color 0.2s;
  }

  .connected .status-dot {
    background-color: var(--theme-won-color);
  }

  .agent-mode {
    display: flex;
    justify-content: center;
  }

  .agent-context {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--theme-bg-accent-color);
    border-radius: 0.375rem;
    font-size: 0.75rem;
  }

  .context-label {
    color: var(--theme-caption-color);
  }

  .context-value {
    font-weight: 500;
  }

  .agent-messages {
    flex: 1;
    min-height: 200px;
  }

  .agent-input {
    padding-top: 0.5rem;
    border-top: 1px solid var(--theme-divider-color);
  }
</style>
