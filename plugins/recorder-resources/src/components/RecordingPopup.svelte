<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import {
    enumerateDevices,
    getDisplayMedia,
    getSelectedCamId,
    getSelectedMicId,
    getMediaStream,
    getMicrophoneStream
  } from '@hcengineering/media'
  import { micAccess, camAccess } from '@hcengineering/media-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { MessageBox } from '@hcengineering/presentation'
  import {
    IconUpOutline,
    Label,
    Modal,
    ModernButton,
    SelectPopup,
    SplitButton,
    eventToHTMLElement,
    resizeObserver,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { DefaultOptions } from '../const'
  import plugin from '../plugin'
  import {
    cancelRecording,
    pauseRecording,
    restartRecording,
    resumeRecording,
    startRecording,
    stopRecording
  } from '../recording'
  import {
    recording,
    recordingCameraPosition,
    recordingCameraSize,
    recordingResolution,
    useScreenShareSound
  } from '../stores'
  import { type RecordingResult } from '../types'
  import { formatElapsedTime, formatRecordingName, whenStreamEnded } from '../utils'

  import IconCamOn from './icons/CamOn.svelte'
  import IconCamOff from './icons/CamOff.svelte'
  import IconMicOn from './icons/MicOn.svelte'
  import IconMicOff from './icons/MicOff.svelte'
  import IconPause from './icons/Pause.svelte'
  import IconPlay from './icons/Play.svelte'
  import IconSettings from './icons/Settings.svelte'
  import IconShare from './icons/Share.svelte'
  import IconStop from './icons/Stop.svelte'
  import RecordingCanvas from './RecordingCanvas.svelte'
  import ShareSettingsPopup from './ShareSettingsPopup.svelte'
  import SettingsPopup from './SettingsPopup.svelte'

  export let onSuccess: (result: RecordingResult) => Promise<void> = async () => {}

  const dispatch = createEventDispatcher()

  let camDeviceId = getSelectedCamId()
  let micDeviceId = getSelectedMicId()

  $: videoRes = $recordingResolution
  $: cameraSize = $recordingCameraSize
  $: cameraPos = $recordingCameraPosition
  $: state = $recording

  let cameraStream: MediaStream | null = null
  let screenStream: MediaStream | null = null
  let micStream: MediaStream | null = null
  let streamPromise: Promise<void> | null = null

  let camEnabled = true
  let micEnabled = true

  let mainStream: MediaStream | null = null
  $: mainStream = screenStream ?? cameraStream
  $: mirrored = screenStream === null

  $: streamPromise = updateMediaStreams(camEnabled, micEnabled, camDeviceId, micDeviceId, videoRes, screenStream)

  $: hasCamAccess = $camAccess.state !== 'denied'
  $: hasMicAccess = $micAccess.state !== 'denied'

  $: if (state !== null && state.state === 'stopped') {
    dispatch('close')
    recording.set(null)
  }

  async function updateMediaStreams (
    camEnabled: boolean,
    micEnabled: boolean,
    camDeviceId: string | undefined,
    micDeviceId: string | undefined,
    videoRes: number,
    screenStream: MediaStream | null
  ): Promise<void> {
    if (streamPromise != null) {
      await streamPromise
    }

    const oldCameraStream = cameraStream
    const oldMicStream = micStream

    try {
      if (camEnabled || micEnabled) {
        const { videoStream, audioStream } = await getCombinedStream(
          camEnabled,
          micEnabled,
          camDeviceId,
          micDeviceId,
          videoRes,
          screenStream
        )

        cameraStream = videoStream
        micStream = audioStream
      } else {
        cameraStream = null
        micStream = null
      }

      // Release old streams
      await Promise.all([releaseStream(oldCameraStream), releaseStream(oldMicStream)])
    } catch (err) {
      console.error('Failed to update media streams:', err)
      // Restore old streams on error
      cameraStream = oldCameraStream
      micStream = oldMicStream
    }
  }

  async function getCombinedStream (
    camEnabled: boolean,
    micEnabled: boolean,
    camDeviceId: string | undefined,
    micDeviceId: string | undefined,
    videoRes: number,
    screenStream: MediaStream | null
  ): Promise<{ videoStream: MediaStream | null, audioStream: MediaStream | null }> {
    if (!camEnabled && !micEnabled) {
      return { videoStream: null, audioStream: null }
    }

    const constraints = {
      video: camEnabled
        ? {
            deviceId: camDeviceId != null ? { exact: camDeviceId } : undefined,
            facingMode: 'user',
            aspectRatio: { ideal: 16 / 9 },
            height: screenStream === null ? { ideal: videoRes } : undefined
          }
        : false,
      audio: micEnabled
        ? {
            deviceId: micDeviceId != null ? { exact: micDeviceId } : undefined
          }
        : false
    }

    try {
      const combinedStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Split the combined stream into separate video and audio streams
      const videoStream = camEnabled ? new MediaStream(combinedStream.getVideoTracks()) : null
      const audioStream = micEnabled ? new MediaStream(combinedStream.getAudioTracks()) : null

      return { videoStream, audioStream }
    } catch (err) {
      console.error('Error getting media stream:', err)
      throw err
    }
  }

  $: if (screenStream !== null) {
    const cleanup = whenStreamEnded(screenStream, () => {
      if (state !== null) {
        void stopRecording()
      }
      screenStream = null
      cleanup()
    })
  }

  $: if (cameraStream !== null) {
    const cleanup = whenStreamEnded(cameraStream, () => {
      if (state !== null) {
        void stopRecording()
      }
      cameraStream = null
      cleanup()
    })
  }

  async function releaseStream (stream: MediaStream | null): Promise<void> {
    if (stream !== null) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }

  onDestroy(async () => {
    await Promise.all([
      streamPromise ?? Promise.resolve(),
      releaseStream(cameraStream),
      releaseStream(screenStream),
      releaseStream(micStream)
    ])
  })

  async function handleShareScreen (): Promise<void> {
    try {
      screenStream = await getDisplayMedia({
        video: {
          frameRate: { ideal: DefaultOptions.fps }
        },
        audio: $useScreenShareSound
      })
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.debug('User denied screen capture permission', err)
      } else {
        console.error('Failed to get display media', err)
      }
    }
  }

  async function handleStopSharing (): Promise<void> {
    await releaseStream(screenStream)
    screenStream = null
  }

  async function handleStartRecording (): Promise<void> {
    if (state != null) {
      console.warn('Recording already in progress', state)
      return
    }

    if (streamPromise !== null) {
      await streamPromise
    }

    const name = await formatRecordingName(
      screenStream !== null ? plugin.string.ScreenRecordingName : plugin.string.CameraRecordingName,
      new Date()
    )

    const canvasStream = canvas.captureStream(DefaultOptions.fps)

    const tracks: MediaStreamTrack[] = []
    tracks.push(...canvasStream.getVideoTracks())
    if (screenStream !== null) {
      tracks.push(...screenStream.getAudioTracks())
    }
    if (micStream !== null) {
      tracks.push(...micStream.getAudioTracks())
    }

    const stream = new MediaStream(tracks)
    await startRecording({ name, stream, fps: DefaultOptions.fps, onSuccess })
  }

  async function handleResumeRecording (): Promise<void> {
    await resumeRecording()
  }

  async function handlePauseRecording (): Promise<void> {
    await pauseRecording()
  }

  async function handleStopRecording (): Promise<void> {
    await stopRecording()
    camEnabled = false
    micEnabled = false
  }

  async function handleRestartRecording (): Promise<void> {
    await pauseRecording()
    showPopup(
      MessageBox,
      {
        label: plugin.string.RestartRecording,
        message: plugin.string.RestartRecordingConfirm
      },
      undefined,
      async (restart: boolean) => {
        if (restart) {
          await restartRecording()
        } else {
          await resumeRecording()
        }
      }
    )
  }

  async function handleCancelRecording (): Promise<void> {
    if (state === null) {
      dispatch('close')
      return
    }

    await pauseRecording()
    showPopup(
      MessageBox,
      {
        label: plugin.string.CancelRecording,
        message: plugin.string.CancelRecordingConfirm
      },
      undefined,
      async (cancel: boolean) => {
        if (cancel) {
          await cancelRecording()
          dispatch('close')
        } else {
          await resumeRecording()
        }
      }
    )
  }

  export function canClose (): boolean {
    return state === null || state.state === 'stopped'
  }

  function handleClose (): void {
    if (canClose()) {
      dispatch('close')
    }
  }

  function handleToggleCam (): void {
    camEnabled = !camEnabled
  }

  function handleToggleMic (): void {
    micEnabled = !micEnabled
  }

  async function handleCamSetting (e: MouseEvent): Promise<void> {
    const devices = await enumerateDevices('videoinput')

    if (devices.length === 0) {
      return
    }

    const items = devices.map((device) => ({
      id: device.deviceId,
      label: getEmbeddedLabel(device.label),
      isSelected: device.deviceId === camDeviceId
    }))

    showPopup(SelectPopup, { value: items }, eventToHTMLElement(e), (deviceId: string) => {
      if (deviceId != null && deviceId !== camDeviceId) {
        camDeviceId = deviceId
      }
    })
  }

  async function handleMicSetting (e: MouseEvent): Promise<void> {
    const devices = await enumerateDevices('audioinput')

    if (devices.length === 0) {
      return
    }

    const items = devices.map((device) => ({
      id: device.deviceId,
      label: getEmbeddedLabel(device.label),
      isSelected: device.deviceId === micDeviceId
    }))

    showPopup(SelectPopup, { value: items }, eventToHTMLElement(e), (deviceId: string) => {
      if (deviceId != null && deviceId !== camDeviceId) {
        micDeviceId = deviceId
      }
    })
  }

  async function handleShareSettings (e: MouseEvent): Promise<void> {
    showPopup(ShareSettingsPopup, {}, eventToHTMLElement(e))
  }

  function handleSettingsClick (e: MouseEvent): void {
    showPopup(SettingsPopup, { value: [] }, eventToHTMLElement(e))
  }

  let canvas: HTMLCanvasElement

  // main container size
  let rootWidth = 640
  let rootHeight = 480
  // canvas original size
  let canvasWidth = 1280
  let canvasHeight = 720
  // canvas container size and scale factor
  let containerWidth = 640
  let containerHeight = 480
  let containerScaleFactor = 1

  $: updateContainerSize(rootWidth, rootHeight, canvasWidth, canvasHeight)

  function updateContainerSize (rootWidth: number, rootHeight: number, canvasWidth: number, canvasHeight: number): void {
    const scaleFactorX = rootWidth / canvasWidth
    const scaleFactorY = rootHeight / canvasHeight

    containerScaleFactor = Math.min(scaleFactorX, scaleFactorY)
    containerWidth = Math.floor(canvasWidth * containerScaleFactor)
    containerHeight = Math.floor(canvasHeight * containerScaleFactor)
  }

  function handleContainerResize (element: Element): void {
    const { width, height } = element.getBoundingClientRect()
    rootWidth = width
    rootHeight = height
  }

  function onKeyDown (e: KeyboardEvent): void {
    if (state?.state === 'stopping') return

    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (state === null) {
        void handleStartRecording()
      }
    } else if (e.key === 'Space') {
      e.preventDefault()
      e.stopPropagation()
      if (state?.state === 'recording') {
        void handlePauseRecording()
      } else if (state?.state === 'paused') {
        void handleResumeRecording()
      }
    }
  }

  let elapsedTime = 0

  onMount(() => {
    const timer = setInterval(() => {
      if ($recording !== null) {
        elapsedTime = $recording.recorder.elapsedTime
      }
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  })
</script>

<svelte:window on:keydown={onKeyDown} />

<Modal
  type="type-popup"
  padding="0"
  scrollableContent={false}
  label={plugin.string.RecordVideo}
  onCancel={handleCancelRecording}
  hideFooter
>
  <div class="container p-3">
    {#if state !== null && state.state === 'stopped'}
      <!-- Maybe show recording result -->
    {:else if mainStream === null}
      <div class="placeholder flex-col-center justify-center">
        {#if streamPromise === null}
          <Label label={plugin.string.SelectVideoToRecord} />
        {/if}
      </div>
    {:else}
      <div
        use:resizeObserver={handleContainerResize}
        class="w-full h-full flex-col-center justify-center"
        style:transform={mirrored ? 'scaleX(-1)' : ''}
      >
        <div
          class="canvas-container"
          style:width={containerWidth + 'px'}
          style:height={containerHeight + 'px'}
          style:transform={`scale(${containerScaleFactor})`}
          style:transform-origin="0 0"
        >
          <RecordingCanvas
            bind:canvas
            bind:canvasWidth
            bind:canvasHeight
            {screenStream}
            {cameraStream}
            {cameraSize}
            {cameraPos}
          />
        </div>
      </div>
    {/if}
  </div>

  <svelte:fragment slot="afterContent">
    <div class="hulyModal-footer px-2">
      {#if state === null}
        <!-- Recording not started -->
        <ModernButton
          size={'small'}
          kind={mainStream === null ? 'secondary' : 'negative'}
          icon={plugin.icon.Record}
          iconProps={{ size: 'small' }}
          label={plugin.string.Record}
          disabled={mainStream === null}
          noFocus
          on:click={handleStartRecording}
        />

        <div class="flex-grow" />

        <ModernButton
          size={'small'}
          kind={'secondary'}
          icon={IconSettings}
          iconProps={{ size: 'small' }}
          noFocus
          on:click={handleSettingsClick}
        />

        <SplitButton
          size={'small'}
          icon={IconShare}
          iconProps={{
            size: 'small'
          }}
          label={screenStream === null ? plugin.string.ShareScreen : plugin.string.StopSharing}
          secondIcon={IconUpOutline}
          secondIconProps={{ size: 'small' }}
          secondAction={handleShareSettings}
          action={screenStream === null ? handleShareScreen : handleStopSharing}
          accent={false}
          separate
          noFocus
        />

        <SplitButton
          size={'small'}
          icon={micEnabled ? IconMicOn : IconMicOff}
          iconProps={{
            size: 'small',
            fill: hasMicAccess
              ? micEnabled
                ? 'var(--theme-state-positive-color)'
                : 'var(--theme-state-negative-color)'
              : 'currentColor'
          }}
          secondIcon={IconUpOutline}
          secondIconProps={{ size: 'small' }}
          secondAction={handleMicSetting}
          action={handleToggleMic}
          disabled={!hasMicAccess}
          separate
          noFocus
        />

        <SplitButton
          size={'small'}
          icon={camEnabled ? IconCamOn : IconCamOff}
          iconProps={{
            size: 'small',
            fill: hasCamAccess
              ? camEnabled
                ? 'var(--theme-state-positive-color)'
                : 'var(--theme-state-negative-color)'
              : 'currentColor'
          }}
          secondIcon={IconUpOutline}
          secondIconProps={{ size: 'small' }}
          secondAction={handleCamSetting}
          action={handleToggleCam}
          disabled={!hasCamAccess}
          separate
          noFocus
        />
      {:else}
        {#if state.state === 'stopped'}
          <!-- Recording completed -->
          <ModernButton
            size={'small'}
            kind={'primary'}
            icon={IconStop}
            iconProps={{ size: 'small' }}
            label={plugin.string.Done}
            noFocus
            on:click={handleClose}
          />
        {:else}
          <!-- Recording in progress -->
          <ModernButton
            size={'small'}
            kind={'negative'}
            icon={IconStop}
            iconProps={{ size: 'small' }}
            label={plugin.string.Stop}
            disabled={state.state === 'stopping'}
            loading={state.state === 'stopping'}
            noFocus
            on:click={handleStopRecording}
          />
        {/if}

        {#if state.state === 'recording'}
          <ModernButton
            size={'small'}
            kind={'secondary'}
            icon={IconPause}
            iconProps={{ size: 'small' }}
            label={plugin.string.Pause}
            noFocus
            on:click={handlePauseRecording}
          />
        {:else if state.state === 'paused'}
          <ModernButton
            size={'small'}
            kind={'secondary'}
            icon={IconPlay}
            iconProps={{ size: 'small' }}
            label={plugin.string.Resume}
            noFocus
            on:click={handleResumeRecording}
          />
        {/if}

        <div class="flex-grow" />

        <div
          class="timer font-medium"
          class:content-color={state.state === 'recording'}
          class:content-dark-color={state.state !== 'recording'}
        >
          {formatElapsedTime(elapsedTime)}
        </div>
      {/if}
    </div>
  </svelte:fragment>
</Modal>

<style lang="scss">
  .container {
    overflow: hidden;
    width: 100%;
    height: 100%;
    min-width: 100%;
    max-width: max(45rem, 60vw);
    max-height: 72vh;
  }

  .placeholder {
    aspect-ratio: 16 / 9;

    width: 100%;
    height: 100%;
  }

  .canvas-container {
    border-radius: 0.75rem;
  }

  .timer {
    padding: 0 0.375rem;
    min-width: 3.5rem;
    text-align: center;
  }
</style>
