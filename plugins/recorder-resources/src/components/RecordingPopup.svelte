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
  import { enumerateDevices } from '@hcengineering/media'
  import { micAccess, camAccess } from '@hcengineering/media-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { FilePreview, MessageBox } from '@hcengineering/presentation'
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
  import { CanvasStreamComposer, canvasWidth as canvasWidthStore, canvasHeight as canvasHeightStore } from '../composer'
  import {
    cancelRecording,
    pauseRecording,
    recordingPopupClosed,
    recordingPopupOpened,
    resumeRecording,
    setCam,
    setMic,
    shareScreen,
    startRecording,
    stopRecording,
    stopScreenShare,
    toggleCam,
    toggleMic
  } from '../recording'
  import {
    canShareScreen,
    camEnabled as camEnabledStore,
    micEnabled as micEnabledStore,
    camDeviceId as camDeviceIdStore,
    micDeviceId as micDeviceIdStore,
    camStream as camStreamStore,
    micStream as micStreamStore,
    screenStream as screenStreamStore,
    loading as loadingStore,
    recorder
  } from '../stores/recorder'
  import { recording } from '../stores/recording'
  import { type RecordingResult } from '../types'
  import { formatElapsedTime, formatRecordingName } from '../utils'

  import IconCamOn from './icons/CamOn.svelte'
  import IconCamOff from './icons/CamOff.svelte'
  import IconMicOn from './icons/MicOn.svelte'
  import IconMicOff from './icons/MicOff.svelte'
  import IconPause from './icons/Pause.svelte'
  import IconPlay from './icons/Play.svelte'
  import IconSettings from './icons/Settings.svelte'
  import IconShare from './icons/Share.svelte'
  import IconStop from './icons/Stop.svelte'
  import ShareSettingsPopup from './ShareSettingsPopup.svelte'
  import SettingsPopup from './SettingsPopup.svelte'

  export let onSuccess: (result: RecordingResult) => Promise<void> = async () => {}

  const dispatch = createEventDispatcher()

  $: loading = $loadingStore
  $: camEnabled = $camEnabledStore
  $: micEnabled = $micEnabledStore
  $: camDeviceId = $camDeviceIdStore
  $: micDeviceId = $micDeviceIdStore
  $: cameraStream = $camStreamStore
  $: micStream = $micStreamStore
  $: screenStream = $screenStreamStore

  $: cameraSize = $recorder.recordingCameraSize
  $: cameraPos = $recorder.recordingCameraPosition
  $: state = $recording

  $: mainStream = screenStream ?? cameraStream
  $: mirrored = screenStream === null

  $: hasCamAccess = $camAccess.state !== 'denied'
  $: hasMicAccess = $micAccess.state !== 'denied'

  $: canvasWidth = $canvasWidthStore
  $: canvasHeight = $canvasHeightStore

  $: canMinimize = screenStream != null

  $: if (state !== null && state.state === 'stopped') {
    recording.clear()
  }

  let video: HTMLVideoElement | null = null

  const composer = new CanvasStreamComposer(null, null, {
    fps: DefaultOptions.fps,
    canvasWidth,
    canvasHeight,
    cameraSize,
    cameraPos
  })

  $: if (video != null) {
    const stream = composer.getStream()
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
  }

  onMount(() => {
    const stream = composer.getStream()
    void composer.start()

    stream.addEventListener('resize', (e) => {
      console.log('resize', e)
    })

    recordingPopupOpened()
  })

  onDestroy(() => {
    void composer.stop()
    recordingPopupClosed()
  })

  $: composer.updateConfig({ cameraSize })
  $: composer.updateConfig({ cameraPos })

  $: void composer.updateCameraStream(cameraStream)
  $: void composer.updateScreenStream(screenStream)

  async function handleShareScreen (): Promise<void> {
    await shareScreen()
  }

  async function handleStopSharing (): Promise<void> {
    await stopScreenShare()
  }

  async function handleStartRecording (): Promise<void> {
    if (state != null) {
      console.warn('Recording already in progress', state)
      return
    }

    const name = await formatRecordingName(
      screenStream !== null ? plugin.string.ScreenRecordingName : plugin.string.CameraRecordingName,
      new Date()
    )

    const canvasStream = composer.getStream()

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

    if (canMinimize) {
      dispatch('close')
    }
  }

  async function handleResumeRecording (): Promise<void> {
    await resumeRecording()
  }

  async function handlePauseRecording (): Promise<void> {
    await pauseRecording()
  }

  async function handleStopRecording (): Promise<void> {
    await stopRecording()
    recorder.setCamEnabled(false)
    recorder.setMicEnabled(false)
  }

  async function handleCancelRecording (): Promise<void> {
    if (state === null || state.state === 'stopped') {
      dispatch('close')
      return
    }

    const wasPaused = state.state === 'paused'
    if (!wasPaused) {
      await pauseRecording()
    }

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
          if (wasPaused) {
            await resumeRecording()
          }
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
    toggleCam()
  }

  function handleToggleMic (): void {
    toggleMic()
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
        setCam(deviceId)
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
      if (deviceId != null && deviceId !== micDeviceId) {
        setMic(deviceId)
      }
    })
  }

  async function handleShareSettings (e: MouseEvent): Promise<void> {
    showPopup(ShareSettingsPopup, {}, eventToHTMLElement(e))
  }

  function handleSettingsClick (e: MouseEvent): void {
    showPopup(SettingsPopup, { value: [] }, eventToHTMLElement(e))
  }

  // main container size
  let rootWidth = 640
  let rootHeight = 480
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
  <div class="container p-3 flex-col-center justify-center">
    {#if state == null && cameraStream === null && screenStream === null && !loading}
      <div class="placeholder flex-col-center justify-center">
        <Label label={plugin.string.SelectVideoToRecord} />
      </div>
    {:else if state !== null && state.state === 'stopped' && state.result != null}
      <div class="preview-container w-full h-full flex-col-center justify-center">
        <FilePreview
          file={state.result.uuid}
          name={state.result.name}
          contentType={state.result.type}
          metadata={{
            originalWidth: state.result.width,
            originalHeight: state.result.height
          }}
          fit
        />
      </div>
    {:else}
      <div
        use:resizeObserver={handleContainerResize}
        class="w-full h-full flex-col-center justify-center"
        style:transform={mirrored ? 'scaleX(-1)' : ''}
      >
        <div class="canvas-container" style:width={containerWidth + 'px'} style:height={containerHeight + 'px'}>
          <!-- svelte-ignore a11y-media-has-caption -->
          <video bind:this={video} autoplay playsinline muted />
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
          disabled={!$canShareScreen}
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
          <ModernButton size={'small'} kind={'primary'} label={plugin.string.Done} noFocus on:click={handleClose} />
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

  .canvas-container,
  .preview-container {
    border-radius: 0.75rem;

    video {
      border-radius: inherit;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
    }
  }

  .timer {
    padding: 0 0.375rem;
    min-width: 3.5rem;
    text-align: center;
  }
</style>
