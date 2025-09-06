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
  import core, { type Blob, type Ref } from '@hcengineering/core'
  import drive, { createFile } from '@hcengineering/drive'
  import { getMediaDevices } from '@hcengineering/media'
  import { micAccess, camAccess } from '@hcengineering/media-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { FilePreview, getClient, MessageBox, SpaceSelector } from '@hcengineering/presentation'
  import {
    EditBox,
    IconUpOutline,
    Label,
    Modal,
    ModernButton,
    PopupResult,
    SelectPopup,
    SplitButton,
    eventToHTMLElement,
    resizeObserver,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  import plugin from '../plugin'
  import { canvasWidth, canvasHeight, canvasStream } from '../stores/composer'
  import {
    cancelRecording,
    cleanupRecording,
    pauseRecording,
    resumeRecording,
    setCam,
    setMic,
    startRecording,
    stopRecording,
    startScreenShare,
    stopScreenShare,
    toggleCam,
    toggleMic,
    recorderState,
    canShareScreen,
    camEnabled,
    micEnabled,
    camDeviceId,
    micDeviceId,
    camStream,
    screenStream,
    loading as loadingStore
  } from '../recording'
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
  import { openDocFromRef } from '@hcengineering/view-resources'

  const dispatch = createEventDispatcher()

  let name = ''
  let space = plugin.space.Drive

  $: loading = $loadingStore
  $: state = $recorderState
  $: mainStream = $screenStream ?? $camStream
  $: mirrored = $screenStream === null
  $: screenShareEnabled = $screenStream !== null

  $: hasCamAccess = $camAccess.state !== 'denied'
  $: hasMicAccess = $micAccess.state !== 'denied'

  $: void updateName(screenShareEnabled)

  let video: HTMLVideoElement | null = null
  $: if (video != null && $canvasStream !== null) {
    video.srcObject = $canvasStream
  }

  async function updateName (screenShareEnabled: boolean): Promise<void> {
    name =
      (await formatRecordingName(
        screenShareEnabled ? plugin.string.ScreenRecordingName : plugin.string.CameraRecordingName,
        new Date()
      )) + '.mp4'
  }

  async function handleCompleteRecording (): Promise<void> {
    if (name.length === 0) return

    const {
      result,
      config: { onFileUploaded, target }
    } = state
    if (result != null) {
      if (onFileUploaded !== undefined) {
        const file = new Blob([], { type: result.type })
        await onFileUploaded({
          name,
          file,
          uuid: result.uuid as Ref<Blob>,
          metadata: {
            width: result.width,
            height: result.height
          }
        })
      }

      if (target === undefined) {
        const client = getClient()
        const fileId = await createFile(client, space, drive.ids.Root, {
          title: name,
          file: result.uuid as Ref<Blob>,
          size: result.size,
          type: result.type,
          lastModified: Date.now(),
          metadata: {
            width: result.width,
            height: result.height
          }
        })
        void openDocFromRef(drive.class.File, fileId)
      } else {
        void openDocFromRef(target.objectClass, target.objectId)
      }
    }

    await cleanupRecording()

    dispatch('close')
  }

  let messageBox: PopupResult | null = null

  async function handleCancelRecording (): Promise<void> {
    if (canClosePopup()) {
      await cancelRecording()

      dispatch('close')
      return
    }

    const shouldPause = state.state === 'recording'
    if (shouldPause) {
      await pauseRecording()
    }

    messageBox = showPopup(
      MessageBox,
      {
        label: plugin.string.CancelRecording,
        message: plugin.string.CancelRecordingConfirm
      },
      undefined,
      async (cancel: boolean) => {
        messageBox = null
        if (cancel) {
          await cancelRecording()
          dispatch('close')
        } else {
          if (shouldPause) {
            await resumeRecording()
          }
        }
      }
    )
  }

  export function canClose (): boolean {
    return false
  }

  function canClosePopup (): boolean {
    return state.state === 'idle' || state.state === 'ready'
  }

  async function handleCamSetting (e: MouseEvent): Promise<void> {
    const mediaDevices = await getMediaDevices(false, true)
    const devices = mediaDevices.devices.filter((d) => d.kind === 'videoinput')

    if (devices.length === 0) {
      return
    }

    const items = devices.map((device) => ({
      id: device.deviceId,
      label: getEmbeddedLabel(device.label),
      isSelected: device.deviceId === $camDeviceId
    }))

    showPopup(SelectPopup, { value: items }, eventToHTMLElement(e), (deviceId: string) => {
      if (deviceId != null && deviceId !== $camDeviceId) {
        setCam(deviceId)
      }
    })
  }

  async function handleMicSetting (e: MouseEvent): Promise<void> {
    const mediaDevices = await getMediaDevices(true, false)
    const devices = mediaDevices.devices.filter((d) => d.kind === 'audioinput')

    if (devices.length === 0) {
      return
    }

    const items = devices.map((device) => ({
      id: device.deviceId,
      label: getEmbeddedLabel(device.label),
      isSelected: device.deviceId === $micDeviceId
    }))

    showPopup(SelectPopup, { value: items }, eventToHTMLElement(e), (deviceId: string) => {
      if (deviceId != null && deviceId !== $micDeviceId) {
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

  $: updateContainerSize(rootWidth, rootHeight, $canvasWidth, $canvasHeight)

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

  function handleKeyDown (e: KeyboardEvent): void {
    if (state?.state === 'stopping') return
    if (messageBox !== null) return

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      void handleCancelRecording()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (state === null) {
        void startRecording()
      }
    } else if (e.key === 'Space') {
      e.preventDefault()
      e.stopPropagation()
      if (state?.state === 'recording') {
        void pauseRecording()
      } else if (state?.state === 'paused') {
        void resumeRecording()
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<Modal
  type="type-popup"
  padding="0"
  scrollableContent={false}
  label={plugin.string.RecordVideo}
  onCancel={handleCancelRecording}
  hideFooter
>
  <div class="container p-3 flex-col-center justify-center">
    {#if state.state === 'ready' && mainStream === null && !loading}
      <div class="placeholder flex-col-center justify-center">
        <Label label={plugin.string.SelectVideoToRecord} />
      </div>
    {:else if state.state === 'stopped' && state.result != null}
      <div class="preview-container w-full h-full flex-col-center justify-center">
        <FilePreview
          file={state.result.uuid}
          name={state.result.uuid}
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
          <video bind:this={video} autoplay playsinline disablepictureinpicture muted />
        </div>
      </div>
    {/if}
  </div>

  <svelte:fragment slot="afterContent">
    <div class="hulyModal-footer px-2">
      {#if state.state === 'ready'}
        <!-- Recording not started -->
        <ModernButton
          size={'small'}
          kind={mainStream === null ? 'secondary' : 'negative'}
          icon={plugin.icon.Record}
          iconProps={{ size: 'small' }}
          label={plugin.string.Record}
          disabled={mainStream === null}
          noFocus
          on:click={startRecording}
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
          label={screenShareEnabled ? plugin.string.StopSharing : plugin.string.ShareScreen}
          secondIcon={IconUpOutline}
          secondIconProps={{ size: 'small' }}
          secondAction={handleShareSettings}
          action={screenShareEnabled ? stopScreenShare : startScreenShare}
          disabled={!$canShareScreen}
          accent={false}
          separate
          noFocus
        />

        <SplitButton
          size={'small'}
          icon={$micEnabled ? IconMicOn : IconMicOff}
          iconProps={{
            size: 'small',
            fill: hasMicAccess
              ? $micEnabled
                ? 'var(--theme-state-positive-color)'
                : 'var(--theme-state-negative-color)'
              : 'currentColor'
          }}
          secondIcon={IconUpOutline}
          secondIconProps={{ size: 'small' }}
          secondAction={handleMicSetting}
          action={toggleMic}
          disabled={!hasMicAccess}
          separate
          noFocus
        />

        <SplitButton
          size={'small'}
          icon={$camEnabled ? IconCamOn : IconCamOff}
          iconProps={{
            size: 'small',
            fill: hasCamAccess
              ? $camEnabled
                ? 'var(--theme-state-positive-color)'
                : 'var(--theme-state-negative-color)'
              : 'currentColor'
          }}
          secondIcon={IconUpOutline}
          secondIconProps={{ size: 'small' }}
          secondAction={handleCamSetting}
          action={toggleCam}
          disabled={!hasCamAccess}
          separate
          noFocus
        />
      {:else if state.state === 'stopped'}
        <ModernButton
          size={'small'}
          kind={'primary'}
          label={view.string.Save}
          noFocus
          on:click={handleCompleteRecording}
          disabled={name.length === 0 || space == null}
        />

        <div class="flex-grow" />

        <EditBox bind:value={name} placeholder={core.string.Name} kind={'default'} autoFocus />

        {#if state.config.target === undefined}
          <SpaceSelector
            bind:space
            _class={drive.class.Drive}
            label={drive.string.Drive}
            kind={'regular'}
            size={'medium'}
            iconWithEmoji={view.ids.IconWithEmoji}
            defaultIcon={drive.icon.Drive}
            focus={false}
          />
        {/if}
      {:else}
        <!-- Stop Button -->
        {#if state.state === 'stopping'}
          <!-- Recording is stopping -->
          <ModernButton
            size={'small'}
            kind={'negative'}
            icon={IconStop}
            iconProps={{ size: 'small' }}
            label={plugin.string.Stop}
            disabled
            loading
            noFocus
            on:click={stopRecording}
          />
        {:else if state.state === 'recording'}
          <!-- Recording in progress -->
          <ModernButton
            size={'small'}
            kind={'negative'}
            icon={IconStop}
            iconProps={{ size: 'small' }}
            label={plugin.string.Stop}
            noFocus
            on:click={stopRecording}
          />
        {/if}

        <!-- Pause Button -->
        {#if state.state === 'recording'}
          <ModernButton
            size={'small'}
            kind={'secondary'}
            icon={IconPause}
            iconProps={{ size: 'small' }}
            label={plugin.string.Pause}
            noFocus
            on:click={pauseRecording}
          />
        {:else if state.state === 'paused'}
          <ModernButton
            size={'small'}
            kind={'secondary'}
            icon={IconPlay}
            iconProps={{ size: 'small' }}
            label={plugin.string.Resume}
            noFocus
            on:click={resumeRecording}
          />
        {/if}

        <div class="flex-grow" />

        <div class="flex-row-center">
          {#if state.state === 'recording' || state.state === 'paused'}
            <div class="dot pulse" />
          {/if}

          <div
            class="timer font-medium"
            class:content-color={state.state === 'recording'}
            class:content-dark-color={state.state !== 'recording'}
          >
            {formatElapsedTime(state.elapsedTime)}
          </div>
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
  }

  .canvas-container {
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

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    margin: 0.25rem;
    border-radius: 50%;
    background: var(--theme-state-negative-color);
  }

  .pulse {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0;
    }
  }
</style>
