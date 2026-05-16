<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
-->
<!--
  Global Fullscreen toggle. Lives in the topmost status bar (next to
  Settings) so the affordance is available on every page, not only
  inside the Gantt viewlet that previously owned it.

  Targets `document.body` rather than a local element so popups/portals
  mounted at workbench-container level (Issue-Editor, QuickInfo, etc.)
  remain visible while fullscreen is active. Best-effort: silently
  ignore failures (e.g. iframes without `allowfullscreen`).
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import StatusBarButton from '../StatusBarButton.svelte'
  import IconMaximize from '../icons/Maximize.svelte'
  import IconMinimize from '../icons/Minimize.svelte'

  let isFullscreen = false

  function onFsChange (): void {
    isFullscreen = document.fullscreenElement != null
  }

  function toggleFullscreen (): void {
    if (document.fullscreenElement != null) {
      void document.exitFullscreen().catch(() => {})
      return
    }
    const target = document.body
    if (target == null) return
    void target.requestFullscreen().catch(() => {})
  }

  onMount(() => {
    document.addEventListener('fullscreenchange', onFsChange)
    onFsChange()
  })
  onDestroy(() => {
    document.removeEventListener('fullscreenchange', onFsChange)
  })
</script>

<StatusBarButton icon={isFullscreen ? IconMinimize : IconMaximize} on:click={toggleFullscreen} />
