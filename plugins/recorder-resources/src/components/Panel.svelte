<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License")
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
  import media, { getDisplayMedia } from '@hcengineering/media'
  import { MessageBox } from '@hcengineering/presentation'
  import { Button, IconClose, IconDelete, closeTooltip, showPopup } from '@hcengineering/ui'
  import { type FileUploadCallback } from '@hcengineering/uploader'
  import { createEventDispatcher, onMount } from 'svelte'

  import plugin from '../plugin'
  import {
    cancelRecording,
    pauseRecording,
    restartRecording,
    resumeRecording,
    startRecording,
    stopRecording
  } from '../recording'
  import { recording } from '../stores'
  import { formatElapsedTime } from '../utils'

  import Countdown from './Countdown.svelte'
  import IconRestart from './icons/Restart.svelte'
  import IconPause from './icons/Pause.svelte'
  import IconPlay from './icons/Play.svelte'
  import IconStop from './icons/Stop.svelte'
  import IconRecord from './icons/Record.svelte'
  import { RecordingResult } from '../types'

  export let cameraStream: MediaStream | null = null
  export let dragging = false
  export let direction: 'top' | 'bottom' = 'bottom'
  export let onFileUploaded: FileUploadCallback | undefined

  // expected to be bound outside
  export let isMicEnabled = true

  const dispatch = createEventDispatcher()

  $: state = $recording

  async function showCountdown (): Promise<void> {
    const showPopupPromise = new Promise<void>((resolve) => {
      showPopup(
        Countdown,
        {},
        undefined,
        async () => {
          resolve()
        },
        undefined,
        {
          category: 'countdown',
          overlay: true,
          fixed: true
        }
      )
    })
    await showPopupPromise
  }

  async function handleStartRecording (): Promise<void> {
    if (state != null) {
      console.warn('Recording already in progress', state)
      return
    }

    let screenStream: MediaStream
    try {
      screenStream = await getDisplayMedia({
        video: {
          frameRate: { ideal: 30 }
        }
      })

      for (const track of screenStream.getVideoTracks()) {
        track.onended = () => {
          void stopRecording()
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.debug('User denied screen capture permission', err)
      } else {
        console.error('Failed to get display media', err)
      }
      return
    }

    await startRecording({
      screenStream,
      // cameraStream,
      // microphoneStream: null,
      fps: 30,
      onSuccess: async (result: RecordingResult) => {
        if (onFileUploaded !== undefined) {
          await onFileUploaded({
            uuid: blobId as Ref<Blob>,
            name: result.name,
            type: 'video/x-mpegURL',
            size: 0,
            lastModified: new Date(),
            path: undefined,
            metadata: undefined,
            navigateOnUpload: true
          })
        }
      },
      onError: (error: any) => {
        console.error('Recording upload failed', error)
      }
    })
  }

  async function handleResumeRecording (): Promise<void> {
    await resumeRecording()
  }

  async function handlePauseRecording (): Promise<void> {
    await pauseRecording()
  }

  async function handleStopRecording (): Promise<void> {
    await stopRecording()
    dispatch('close')
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
    await cancelRecording()
    dispatch('close', true)
  }

  async function handleDeleteRecording (): Promise<void> {
    await pauseRecording()
    showPopup(
      MessageBox,
      {
        label: plugin.string.CancelRecording,
        message: plugin.string.CancelRecordingConfirm
      },
      undefined,
      async (restart: boolean) => {
        if (restart) {
          await cancelRecording()
          dispatch('close', true)
        } else {
          await resumeRecording()
        }
      }
    )
  }

  function handleToggleMic (): void {
    isMicEnabled = !isMicEnabled
  }

  $: if (dragging) {
    closeTooltip()
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

<div class="buttons-panel" class:pointer-events-none={dragging}>
  <!-- Recording not started -->
  {#if state == null}
    <Button icon={IconRecord} kind={'primary'} label={plugin.string.Record} noFocus on:click={handleStartRecording} />

    <Button
      icon={isMicEnabled ? media.icon.Mic : media.icon.MicOff}
      kind={'icon'}
      showTooltip={{ label: isMicEnabled ? media.string.TurnOffMic : media.string.TurnOnMic, direction }}
      noFocus
      on:click={handleToggleMic}
    />

    <Button
      icon={IconClose}
      kind={'icon'}
      showTooltip={{ label: plugin.string.Cancel, direction }}
      noFocus
      on:click={handleCancelRecording}
    />
  {:else}
    <Button
      icon={IconStop}
      kind={state.state === 'recording' ? 'dangerous' : 'icon'}
      showTooltip={{ label: plugin.string.Stop, direction }}
      disabled={state.state === 'stopped'}
      noFocus
      on:click={handleStopRecording}
    />

    <div class="divider" />

    {#if state.state === 'recording'}
      <Button
        icon={IconPause}
        kind={'icon'}
        showTooltip={{ label: plugin.string.Pause, direction }}
        noFocus
        on:click={handlePauseRecording}
      />
    {:else if state.state === 'paused'}
      <Button
        icon={IconPlay}
        kind={'primary'}
        showTooltip={{ label: plugin.string.Resume, direction }}
        noFocus
        on:click={handleResumeRecording}
      />
    {/if}

    <div
      class="timer font-medium"
      class:content-color={state.state === 'recording'}
      class:content-dark-color={state.state !== 'recording'}
    >
      {formatElapsedTime(elapsedTime)}
    </div>

    <Button
      icon={isMicEnabled ? media.icon.Mic : media.icon.MicOff}
      kind={'icon'}
      showTooltip={{ label: isMicEnabled ? media.string.TurnOffMic : media.string.TurnOnMic, direction }}
      noFocus
      on:click={handleToggleMic}
    />

    <div class="divider" />

    <Button
      icon={IconRestart}
      kind={'icon'}
      showTooltip={{ label: plugin.string.RestartRecording, direction }}
      noFocus
      on:click={handleRestartRecording}
    />

    <Button
      icon={IconDelete}
      kind={'icon'}
      showTooltip={{ label: plugin.string.Cancel, direction }}
      noFocus
      on:click={handleDeleteRecording}
    />
  {/if}
</div>

<style lang="scss">
  .buttons-panel {
    display: flex;
    align-items: center;
    border-radius: 0.75rem;
    border: 1px solid var(--button-border-color);
    background-color: var(--theme-bg-color);
    gap: 0.375rem;
    padding: 0.375rem;
  }

  .timer {
    padding: 0 0.375rem;
    min-width: 3.5rem;
    text-align: center;
  }

  .divider {
    width: 1px;
    background-color: var(--theme-divider-color);
    align-self: stretch;
  }
</style>
