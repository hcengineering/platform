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
  import { type Blob as HulyBlob, type Ref } from '@hcengineering/core'
  import { CircleButton, Progress, CheckBox, Spinner } from '@hcengineering/ui'
  import { getFileUrl } from '@hcengineering/presentation'
  import { onMount } from 'svelte'

  import Pause from '../icons/Pause.svelte'
  import Play from '../icons/Play.svelte'

  export let value: Ref<HulyBlob>
  export let name: string
  export let contentType: string
  export let fullSize = false
  export let developerMode = false

  let time = 0
  let duration = Number.POSITIVE_INFINITY
  let paused = true
  let audioElement: HTMLAudioElement

  // Dynamic import for audio-dsp to handle webpack resolution
  let reduceNoise: ((samples: Float32Array, sampleRate: number, config?: any) => Float32Array) | null = null

  async function loadAudioDsp (): Promise<void> {
    if (reduceNoise !== null) return
    try {
      // Use dynamic import with explicit path
      const audioDsp = await import('@hcengineering/audio-dsp')
      reduceNoise = audioDsp.reduceNoise
      console.log('[AudioPlayer] audio-dsp loaded successfully')
    } catch (err) {
      console.error('[AudioPlayer] Failed to load audio-dsp:', err)
    }
  }

  // Noise reduction state
  let noiseReductionEnabled = false
  let isProcessingNoiseReduction = false
  let denoisedAudioUrl: string | null = null
  let originalAudioUrl: string | null = null
  let noiseReductionStats: { averageReductionDb: number } | null = null

  // Waveform data - both original and denoised
  let originalWaveformData: number[] = []
  let denoisedWaveformData: number[] = []

  // Waveform visualization
  let canvas: HTMLCanvasElement | undefined
  let isAnalyzing = false
  let animationFrameId: number | null = null
  let resizeObserver: ResizeObserver | null = null
  let lastCanvasWidth: number = 0

  // Waveform settings
  const MIN_BAR_WIDTH = 2
  const MAX_BAR_WIDTH = 4
  const BAR_GAP = 1

  function handleClick (): void {
    paused = !paused
  }

  $: icon = !paused ? Pause : Play
  $: progressRatio = Number.isFinite(duration) && duration > 0 ? time / duration : 0

  // Handle noise reduction toggle
  async function handleNoiseReductionToggle (): Promise<void> {
    console.log('[AudioPlayer] handleNoiseReductionToggle called, isProcessing:', isProcessingNoiseReduction)
    if (isProcessingNoiseReduction) return

    noiseReductionEnabled = !noiseReductionEnabled
    console.log('[AudioPlayer] noiseReductionEnabled toggled to:', noiseReductionEnabled)

    if (noiseReductionEnabled && denoisedAudioUrl === null) {
      console.log('[AudioPlayer] Starting noise reduction processing...')
      await processNoiseReduction()
      console.log('[AudioPlayer] Noise reduction completed, denoisedWaveformData.length:', denoisedWaveformData.length)
    }

    updateAudioSource()
    scheduleRedraw()
  }

  function updateAudioSource (): void {
    if (audioElement === undefined) return

    const wasPlaying = !paused
    const currentTime = time

    if (noiseReductionEnabled && denoisedAudioUrl !== null) {
      audioElement.src = denoisedAudioUrl
    } else if (originalAudioUrl !== null) {
      audioElement.src = originalAudioUrl
    }

    audioElement.load()
    audioElement.currentTime = currentTime

    if (wasPlaying) {
      void audioElement.play()
    }
  }

  async function processNoiseReduction (): Promise<void> {
    console.log('[AudioPlayer] processNoiseReduction called')

    if (isProcessingNoiseReduction || audioBuffer === null) {
      console.log('[AudioPlayer] Early return - isProcessing or no audioBuffer')
      return
    }

    // Ensure audio-dsp is loaded
    await loadAudioDsp()

    if (reduceNoise === null) {
      console.error('[AudioPlayer] reduceNoise not available after loading')
      return
    }

    isProcessingNoiseReduction = true

    try {
      const channelData = audioBuffer.getChannelData(0)
      const samples = new Float32Array(channelData)

      const config = {
        frameSize: 512,
        hopSize: 256,
        noiseEstimationFrames: 20,
        overSubtractionFactor: 2.0,
        spectralFloor: 0.02
      }

      console.log('[AudioPlayer] Calling reduceNoise with', samples.length, 'samples at', audioBuffer.sampleRate, 'Hz')
      const denoisedSamples = reduceNoise(samples, audioBuffer.sampleRate, config)
      console.log('[AudioPlayer] reduceNoise returned', denoisedSamples.length, 'samples')

      // Create WAV blob from denoised samples
      const wavBlob = createWavBlob(denoisedSamples, audioBuffer.sampleRate)
      denoisedAudioUrl = URL.createObjectURL(wavBlob)
      console.log('[AudioPlayer] Created denoised audio URL:', denoisedAudioUrl)

      // Calculate rough stats
      const originalRms = calculateRms(samples)
      const denoisedRms = calculateRms(denoisedSamples)
      const reductionDb = originalRms > 0 && denoisedRms > 0 ? 20 * Math.log10(denoisedRms / originalRms) : 0

      noiseReductionStats = { averageReductionDb: reductionDb }

      // Analyze denoised waveform
      if (canvas !== undefined) {
        const barCount = calculateBarCount(canvas.getBoundingClientRect().width)
        console.log('[AudioPlayer] Analyzing denoised waveform with', barCount, 'bars')
        denoisedWaveformData = analyzeFromFloat32Array(denoisedSamples, barCount)
        console.log('[AudioPlayer] denoisedWaveformData set, length:', denoisedWaveformData.length)
      } else {
        console.log('[AudioPlayer] canvas is undefined, cannot analyze waveform')
      }
    } catch (err) {
      console.error('[AudioPlayer] Failed to apply noise reduction:', err)
      noiseReductionEnabled = false
    } finally {
      isProcessingNoiseReduction = false
      console.log('[AudioPlayer] processNoiseReduction finished')
    }
  }

  function calculateRms (samples: Float32Array): number {
    let sumSquares = 0
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i]
    }
    return Math.sqrt(sumSquares / samples.length)
  }

  function createWavBlob (samples: Float32Array, sampleRate: number): globalThis.Blob {
    const numChannels = 1
    const bitsPerSample = 16
    const bytesPerSample = bitsPerSample / 8
    const dataLength = samples.length * bytesPerSample
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)

    // RIFF header
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    writeString(view, 8, 'WAVE')

    // fmt chunk
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
    view.setUint16(32, numChannels * bytesPerSample, true)
    view.setUint16(34, bitsPerSample, true)

    // data chunk
    writeString(view, 36, 'data')
    view.setUint32(40, dataLength, true)

    // Write samples
    let offset = 44
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(offset, Math.round(sample * 32767), true)
      offset += 2
    }

    return new globalThis.Blob([buffer], { type: 'audio/wav' })
  }

  function writeString (view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  function analyzeAudioData (audioBuffer: AudioBuffer, barCount: number): number[] {
    const channelData = audioBuffer.getChannelData(0)
    return analyzeFromFloat32Array(channelData, barCount)
  }

  function analyzeFromFloat32Array (channelData: Float32Array, barCount: number): number[] {
    const samplesPerBar = Math.floor(channelData.length / barCount)
    const bars: number[] = []
    let maxRms = 0

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

    if (maxRms > 0) {
      for (let i = 0; i < bars.length; i++) {
        bars[i] = bars[i] / maxRms
      }
    }

    return bars
  }

  let audioBuffer: AudioBuffer | null = null

  function calculateBarCount (width: number): number {
    const minBars = Math.floor(width / (MAX_BAR_WIDTH + BAR_GAP))
    const maxBars = Math.floor(width / (MIN_BAR_WIDTH + BAR_GAP))
    return Math.max(10, Math.min(Math.max(minBars, maxBars), 200))
  }

  async function loadAndAnalyzeAudio (): Promise<void> {
    if (isAnalyzing || audioBuffer !== null) return

    isAnalyzing = true

    try {
      const audioUrl = getFileUrl(value, name)
      originalAudioUrl = audioUrl

      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()

      const audioContext = new AudioContext()
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      if (canvas !== undefined) {
        const barCount = calculateBarCount(canvas.getBoundingClientRect().width)
        originalWaveformData = analyzeAudioData(audioBuffer, barCount)
      }

      await audioContext.close()
    } catch (err) {
      console.error('Failed to analyze audio:', err)
      originalWaveformData = Array(50)
        .fill(0)
        .map(() => Math.random() * 0.3 + 0.1)
    } finally {
      isAnalyzing = false
    }
  }

  function reanalyzeForWidth (width: number): void {
    if (audioBuffer === null) return
    const barCount = calculateBarCount(width)
    if (barCount !== originalWaveformData.length) {
      originalWaveformData = analyzeAudioData(audioBuffer, barCount)
      // Also re-analyze denoised if available
      if (denoisedWaveformData.length > 0 && denoisedAudioUrl !== null) {
        // We need to reload and re-analyze, but for now just scale
        // This is a simplification - in production you'd want to store the denoised samples
      }
    }
  }

  /**
   * Draw comparison waveforms:
   * - In normal mode: single waveform (original)
   * - In comparison mode: original on top (gray), denoised on bottom (green)
   */
  function drawWaveform (currentProgress: number): void {
    if (canvas === undefined || originalWaveformData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (ctx === null) return

    const dpr = window.devicePixelRatio !== 0 ? window.devicePixelRatio : 1
    const rect = canvas.getBoundingClientRect()

    reanalyzeForWidth(rect.width)

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const barCount = originalWaveformData.length
    const barWidth = width / barCount
    const effectiveBarWidth = Math.min(MAX_BAR_WIDTH, Math.max(MIN_BAR_WIDTH, barWidth - BAR_GAP))

    ctx.clearRect(0, 0, width, height)

    const showComparison = noiseReductionEnabled && denoisedWaveformData.length > 0

    if (showComparison) {
      // Comparison mode: two waveforms stacked
      const topHeight = height * 0.45
      const bottomHeight = height * 0.45
      const gap = height * 0.1
      const topCenterY = topHeight / 2
      const bottomCenterY = topHeight + gap + bottomHeight / 2

      // Draw separator line
      ctx.strokeStyle = 'var(--theme-divider-color)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, topHeight + gap / 2)
      ctx.lineTo(width, topHeight + gap / 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw labels
      ctx.font = '10px var(--font-family)'
      ctx.fillStyle = 'var(--theme-halfcontent-color)'
      ctx.textAlign = 'left'
      ctx.fillText('Original', 4, 12)
      ctx.fillStyle = 'var(--positive-button-default)'
      ctx.fillText('Denoised', 4, topHeight + gap + 12)

      // Draw original waveform (top) - only upward bars
      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth
        const barHeight = Math.max(1, originalWaveformData[i] * topHeight * 0.8)

        const barProgress = i / barCount
        const isPlayed = barProgress <= currentProgress

        if (isPlayed) {
          ctx.fillStyle = 'var(--theme-content-color)'
        } else {
          ctx.fillStyle = 'var(--theme-halfcontent-color)'
        }

        const radius = Math.min(effectiveBarWidth / 2, 1)
        ctx.beginPath()
        ctx.roundRect(x, topCenterY - barHeight / 2, effectiveBarWidth, barHeight, radius)
        ctx.fill()
      }

      // Draw denoised waveform (bottom) - only upward bars
      for (let i = 0; i < Math.min(barCount, denoisedWaveformData.length); i++) {
        const x = i * barWidth
        const barHeight = Math.max(1, denoisedWaveformData[i] * bottomHeight * 0.8)

        const barProgress = i / barCount
        const isPlayed = barProgress <= currentProgress

        if (isPlayed) {
          ctx.fillStyle = 'var(--positive-button-default)'
        } else {
          ctx.fillStyle = 'rgba(var(--positive-button-default-rgb), 0.4)'
        }

        const radius = Math.min(effectiveBarWidth / 2, 1)
        ctx.beginPath()
        ctx.roundRect(x, bottomCenterY - barHeight / 2, effectiveBarWidth, barHeight, radius)
        ctx.fill()
      }

      // Draw difference overlay (subtle highlight where noise was removed)
      ctx.globalAlpha = 0.15
      for (let i = 0; i < Math.min(barCount, denoisedWaveformData.length); i++) {
        const originalHeight = originalWaveformData[i] * topHeight * 0.8
        const denoisedHeight = denoisedWaveformData[i] * bottomHeight * 0.8
        const diff = originalHeight - denoisedHeight

        if (diff > 2) {
          const x = i * barWidth
          ctx.fillStyle = 'var(--negative-button-default)'
          ctx.fillRect(x, topCenterY - originalHeight / 2, effectiveBarWidth, diff)
        }
      }
      ctx.globalAlpha = 1.0
    } else {
      // Normal mode: single waveform centered
      const centerY = height / 2

      // Draw center line
      ctx.strokeStyle = 'var(--theme-divider-color)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      ctx.lineTo(width, centerY)
      ctx.stroke()

      // Draw symmetric bars from center
      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth
        const halfBarHeight = Math.max(1, originalWaveformData[i] * (height / 2) * 0.9)

        const barProgress = i / barCount
        const isPlayed = barProgress <= currentProgress

        if (isPlayed) {
          ctx.fillStyle = 'var(--primary-button-default)'
        } else {
          ctx.fillStyle = 'var(--theme-halfcontent-color)'
        }

        const radius = Math.min(effectiveBarWidth / 2, 1)
        ctx.beginPath()
        ctx.roundRect(x, centerY - halfBarHeight, effectiveBarWidth, halfBarHeight * 2, radius)
        ctx.fill()
      }
    }
  }

  function scheduleRedraw (): void {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null
      drawWaveform(progressRatio)
    })
  }

  function handleWaveformClick (event: MouseEvent): void {
    if (canvas === undefined || !Number.isFinite(duration)) return

    const rect = canvas.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickRatio = clickX / rect.width
    const newTime = clickRatio * duration

    time = Math.max(0, Math.min(duration, newTime))
  }

  $: if (originalWaveformData.length > 0 && canvas !== undefined) {
    scheduleRedraw()
  }

  $: if (progressRatio !== undefined && originalWaveformData.length > 0) {
    scheduleRedraw()
  }

  $: if (noiseReductionEnabled !== undefined) {
    scheduleRedraw()
  }

  $: if (denoisedWaveformData.length > 0 && canvas !== undefined) {
    scheduleRedraw()
  }

  function setupCanvasObserver (node: HTMLCanvasElement): { destroy: () => void } {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width
        if (Math.abs(newWidth - lastCanvasWidth) > 10) {
          lastCanvasWidth = newWidth
          if (audioBuffer !== null) {
            const barCount = calculateBarCount(newWidth)
            if (barCount !== originalWaveformData.length) {
              originalWaveformData = analyzeAudioData(audioBuffer, barCount)
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
      if (denoisedAudioUrl !== null) {
        URL.revokeObjectURL(denoisedAudioUrl)
      }
    }
  })
</script>

<div class="container" class:fullSize class:comparison={noiseReductionEnabled && denoisedWaveformData.length > 0}>
  <!-- Waveform row -->
  <div class="waveform-row">
    <div class="play-button-spacer"></div>
    <div class="waveform-container" class:expanded={noiseReductionEnabled && denoisedWaveformData.length > 0}>
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

  <!-- Developer mode: Noise reduction toggle -->
  {#if developerMode}
    <div class="dev-controls">
      <div class="noise-reduction-toggle">
        {#if isProcessingNoiseReduction}
          <Spinner size="small" />
          <span class="processing-text">Processing noise reduction...</span>
        {:else}
          <CheckBox checked={noiseReductionEnabled} on:value={handleNoiseReductionToggle} />
          <span
            class="toggle-label"
            class:active={noiseReductionEnabled}
            title="Spectral subtraction noise reduction (experimental). When enabled, shows comparison and plays denoised audio."
          >
            Noise Reduction
          </span>
          {#if noiseReductionEnabled && noiseReductionStats !== null}
            <span class="stats">
              ({noiseReductionStats.averageReductionDb.toFixed(1)} dB)
            </span>
            <span class="playing-indicator"> ▶ Playing denoised </span>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
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
    transition: all 0.2s ease;

    &.fullSize {
      width: 100%;
    }

    &.comparison {
      border-color: var(--positive-button-default);
    }
  }

  .waveform-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .play-button-spacer {
    width: 2.75rem;
    flex-shrink: 0;
  }

  .time-spacer {
    width: 5rem;
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
    transition: height 0.2s ease;

    &.expanded {
      height: 5rem;
    }
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

  .dev-controls {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--theme-divider-color);
  }

  .noise-reduction-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    flex-wrap: wrap;

    .toggle-label {
      color: var(--theme-halfcontent-color);
      cursor: pointer;
      user-select: none;

      &.active {
        color: var(--positive-button-default);
        font-weight: 500;
      }
    }

    .processing-text {
      color: var(--theme-halfcontent-color);
      font-style: italic;
    }

    .stats {
      color: var(--theme-dark-color);
      font-size: 0.625rem;
    }

    .playing-indicator {
      color: var(--positive-button-default);
      font-size: 0.625rem;
      font-weight: 500;
      animation: pulse 1.5s ease-in-out infinite;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
