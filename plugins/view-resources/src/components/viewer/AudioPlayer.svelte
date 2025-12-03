<script context="module" lang="ts">
  function formatTime (seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
</script>

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
  import { type Blob, type Ref } from '@hcengineering/core'
  import { CircleButton, Progress } from '@hcengineering/ui'
  import { getFileUrl } from '@hcengineering/presentation'
  import { onMount } from 'svelte'

  import Pause from '../icons/Pause.svelte'
  import Play from '../icons/Play.svelte'

  export let value: Ref<Blob>
  export let name: string
  export let contentType: string
  export let fullSize = false

  let time = 0
  let duration = Number.POSITIVE_INFINITY
  let paused = true
  let audioElement: HTMLAudioElement

  // Waveform visualization
  let canvas: HTMLCanvasElement | undefined
  let waveformData: number[] = []
  let isAnalyzing = false
  let animationFrameId: number | null = null
  let resizeObserver: ResizeObserver | null = null
  let lastCanvasWidth: number = 0

  // Waveform settings
  const MIN_BAR_WIDTH = 2 // Minimum width of each bar in pixels
  const MAX_BAR_WIDTH = 4 // Maximum width of each bar in pixels
  const BAR_GAP = 1 // Gap between bars

  function handleClick (): void {
    paused = !paused
  }

  $: icon = !paused ? Pause : Play

  // Calculate progress ratio for waveform highlight
  $: progressRatio = Number.isFinite(duration) && duration > 0 ? time / duration : 0

  /**
   * Analyze audio buffer and calculate normalized amplitude for given number of segments
   */
  function analyzeAudioData (audioBuffer: AudioBuffer, barCount: number): number[] {
    const channelData = audioBuffer.getChannelData(0) // Use first channel
    const samplesPerBar = Math.floor(channelData.length / barCount)
    const bars: number[] = []
    let maxRms = 0

    // First pass: calculate RMS for each segment
    for (let i = 0; i < barCount; i++) {
      const start = i * samplesPerBar
      const end = Math.min(start + samplesPerBar, channelData.length)

      let sumSquares = 0

      for (let j = start; j < end; j++) {
        const sample = channelData[j]
        sumSquares += sample * sample
      }

      const rms = Math.sqrt(sumSquares / (end - start))
      bars.push(rms)
      if (rms > maxRms) maxRms = rms
    }

    // Second pass: normalize relative to max
    if (maxRms > 0) {
      for (let i = 0; i < bars.length; i++) {
        bars[i] = bars[i] / maxRms
      }
    }

    return bars
  }

  // Store raw audio buffer for re-analysis on resize
  let audioBuffer: AudioBuffer | null = null

  /**
   * Calculate optimal bar count based on container width
   */
  function calculateBarCount (width: number): number {
    const minBars = Math.floor(width / (MAX_BAR_WIDTH + BAR_GAP))
    const maxBars = Math.floor(width / (MIN_BAR_WIDTH + BAR_GAP))
    // Use minimum bars to get consistent max bar width, but cap between 10 and 200
    return Math.max(10, Math.min(Math.max(minBars, maxBars), 200))
  }

  /**
   * Load and analyze audio file
   */
  async function loadAndAnalyzeAudio (): Promise<void> {
    if (isAnalyzing || audioBuffer !== null) return

    isAnalyzing = true

    try {
      const audioUrl = getFileUrl(value, name)
      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()

      const audioContext = new AudioContext()
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Initial analysis with default bar count, will be recalculated on draw
      if (canvas !== undefined) {
        const barCount = calculateBarCount(canvas.getBoundingClientRect().width)
        waveformData = analyzeAudioData(audioBuffer, barCount)
      }

      await audioContext.close()
    } catch (err) {
      console.error('Failed to analyze audio:', err)
      // Generate placeholder waveform on error
      waveformData = Array(50)
        .fill(0)
        .map(() => Math.random() * 0.3 + 0.1)
    } finally {
      isAnalyzing = false
    }
  }

  /**
   * Re-analyze audio for new bar count (on resize)
   */
  function reanalyzeForWidth (width: number): void {
    if (audioBuffer === null) return
    const barCount = calculateBarCount(width)
    if (barCount !== waveformData.length) {
      waveformData = analyzeAudioData(audioBuffer, barCount)
    }
  }

  /**
   * Draw waveform on canvas
   */
  function drawWaveform (currentProgress: number): void {
    if (canvas === undefined || waveformData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (ctx === null) return

    const dpr = window.devicePixelRatio !== 0 ? window.devicePixelRatio : 1
    const rect = canvas.getBoundingClientRect()

    // Re-analyze if width changed significantly
    reanalyzeForWidth(rect.width)

    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const barCount = waveformData.length
    const barWidth = width / barCount
    // Ensure consistent bar width between MIN and MAX
    const effectiveBarWidth = Math.min(MAX_BAR_WIDTH, Math.max(MIN_BAR_WIDTH, barWidth - BAR_GAP))

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const centerY = height / 2

    // Draw center line (subtle)
    ctx.strokeStyle = 'var(--theme-divider-color)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(width, centerY)
    ctx.stroke()

    // Draw symmetric bars from center
    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth
      // Each bar extends both up and down from center
      const halfBarHeight = Math.max(1, waveformData[i] * (height / 2) * 0.9)

      // Determine if this bar is before or after the current playback position
      const barProgress = i / barCount
      const isPlayed = barProgress <= currentProgress

      if (isPlayed) {
        ctx.fillStyle = 'var(--primary-button-default)'
      } else {
        ctx.fillStyle = 'var(--theme-halfcontent-color)'
      }

      // Draw bar from center going up and down
      const radius = Math.min(effectiveBarWidth / 2, 1)
      ctx.beginPath()
      ctx.roundRect(x, centerY - halfBarHeight, effectiveBarWidth, halfBarHeight * 2, radius)
      ctx.fill()
    }
  }

  /**
   * Schedule a redraw using requestAnimationFrame to avoid loops
   */
  function scheduleRedraw (): void {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null
      drawWaveform(progressRatio)
    })
  }

  /**
   * Handle click on waveform to seek
   */
  function handleWaveformClick (event: MouseEvent): void {
    if (canvas === undefined || !Number.isFinite(duration)) return

    const rect = canvas.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickRatio = clickX / rect.width
    const newTime = clickRatio * duration

    time = Math.max(0, Math.min(duration, newTime))
  }

  // Redraw waveform when data changes
  $: if (waveformData.length > 0 && canvas !== undefined) {
    scheduleRedraw()
  }

  // Redraw on progress change
  $: if (progressRatio !== undefined && waveformData.length > 0) {
    scheduleRedraw()
  }

  function setupCanvasObserver (node: HTMLCanvasElement): { destroy: () => void } {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width
        // Reanalyze if width changed significantly (more than 10px)
        if (Math.abs(newWidth - lastCanvasWidth) > 10) {
          lastCanvasWidth = newWidth
          if (audioBuffer !== null) {
            const barCount = calculateBarCount(newWidth)
            if (barCount !== waveformData.length) {
              waveformData = analyzeAudioData(audioBuffer, barCount)
            }
          }
        }
      }
      scheduleRedraw()
    })
    resizeObserver.observe(node)
    canvas = node
    lastCanvasWidth = node.getBoundingClientRect().width
    scheduleRedraw()

    return {
      destroy () {
        if (resizeObserver !== null) {
          resizeObserver.disconnect()
          resizeObserver = null
        }
      }
    }
  }

  onMount(() => {
    void loadAndAnalyzeAudio()

    return () => {
      if (resizeObserver !== null) {
        resizeObserver.disconnect()
      }
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  })
</script>

<div class="container" class:fullSize>
  <!-- Waveform row - aligned with progress bar -->
  <div class="waveform-row">
    <div class="play-button-spacer"></div>
    <div class="waveform-container">
      {#if isAnalyzing}
        <div class="waveform-loading">
          <div class="loading-animation"></div>
        </div>
      {:else}
        <canvas use:setupCanvasObserver class="waveform-canvas" on:click={handleWaveformClick}></canvas>
      {/if}
    </div>
    <div class="time-spacer"></div>
  </div>

  <!-- Controls row -->
  <div class="controls-row">
    <div class="play-button">
      <CircleButton size="x-large" on:click={handleClick} {icon} />
    </div>
    <div class="progress-bar">
      <Progress
        value={time}
        max={Number.isFinite(duration) ? duration : 100}
        editable
        on:change={(e) => (time = e.detail)}
      />
    </div>
    <div class="time-display">
      {#if Number.isFinite(duration)}
        <span class="current-time">{formatTime(time)}</span>
        <span class="separator">/</span>
        <span class="total-time">{formatTime(duration)}</span>
      {/if}
    </div>
  </div>
</div>

<audio bind:this={audioElement} bind:duration bind:currentTime={time} bind:paused>
  <source src={getFileUrl(value, name)} type={contentType} />
</audio>

<style lang="scss">
  .container {
    padding: 0.5rem;
    width: 20rem;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;

    &.fullSize {
      width: 100%;
    }
  }

  .waveform-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .play-button-spacer {
    width: 2.75rem; // Same as x-large CircleButton
    flex-shrink: 0;
  }

  .time-spacer {
    width: 5rem; // Same as time-display min-width
    flex-shrink: 0;
  }

  .waveform-container {
    flex: 1;
    min-width: 0;
    height: 3rem;
    position: relative;
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: var(--theme-bg-color);
  }

  .waveform-canvas {
    width: 100%;
    height: 100%;
    cursor: pointer;
    display: block;
  }

  .waveform-loading {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-animation {
    width: 100%;
    height: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;

    &::before,
    &::after,
    & {
      content: '';
      display: flex;
      gap: 2px;
    }

    background: linear-gradient(
      90deg,
      var(--theme-halfcontent-color) 0%,
      var(--theme-caption-color) 50%,
      var(--theme-halfcontent-color) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 0.25rem;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .controls-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .play-button {
    flex-shrink: 0;
  }

  .progress-bar {
    flex: 1;
    min-width: 0;
  }

  .time-display {
    font-size: 0.75rem;
    color: var(--theme-caption-color);
    white-space: nowrap;
    min-width: 5rem;
    text-align: right;

    .separator {
      margin: 0 0.125rem;
      color: var(--theme-halfcontent-color);
    }

    .current-time {
      color: var(--theme-content-color);
    }

    .total-time {
      color: var(--theme-halfcontent-color);
    }
  }
</style>
