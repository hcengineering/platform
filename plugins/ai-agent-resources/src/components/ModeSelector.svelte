<script lang="ts">
  // Copyright © 2026 Krang / Subfracture
  // Mode Selector - Watching / Active / Autonomous

  import { createEventDispatcher } from 'svelte'
  import { Label } from '@hcengineering/ui'
  import type { AgentMode } from '@hcengineering/ai-agent'
  import aiAgent from '@hcengineering/ai-agent'

  export let mode: AgentMode = 'watching'

  const dispatch = createEventDispatcher<{ change: AgentMode }>()

  const modes: { id: AgentMode; label: typeof aiAgent.string.Watching }[] = [
    { id: 'watching', label: aiAgent.string.Watching },
    { id: 'active', label: aiAgent.string.Active },
    { id: 'autonomous', label: aiAgent.string.Autonomous }
  ]

  function selectMode(newMode: AgentMode) {
    mode = newMode
    dispatch('change', mode)
  }
</script>

<div class="mode-selector">
  {#each modes as m}
    <button
      class="mode-button"
      class:selected={mode === m.id}
      on:click={() => selectMode(m.id)}
    >
      <Label label={m.label} />
    </button>
  {/each}
</div>

<style lang="scss">
  .mode-selector {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--theme-bg-accent-color);
    border-radius: 0.5rem;
  }

  .mode-button {
    padding: 0.375rem 0.75rem;
    border: none;
    background: transparent;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: var(--theme-caption-color);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--theme-button-hovered);
    }

    &.selected {
      background: var(--theme-button-pressed);
      color: var(--theme-content-color);
      font-weight: 500;
    }
  }
</style>
