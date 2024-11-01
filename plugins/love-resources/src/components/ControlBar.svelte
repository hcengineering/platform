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
  import { PersonAccount } from '@hcengineering/contact'
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import love, { Room, RoomType, isOffice, roomAccessIcon } from '@hcengineering/love'
  import { getResource } from '@hcengineering/platform'
  import { copyTextToClipboard, getClient } from '@hcengineering/presentation'
  import {
    IconUpOutline,
    ModernButton,
    PopupInstance,
    SplitButton,
    eventToHTMLElement,
    getCurrentLocation,
    showPopup,
    type AnySvelteComponent,
    type CompAndProps,
    resizeObserver
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import plugin from '../plugin'
  import { currentRoom, myInfo, myOffice } from '../stores'
  import {
    isCameraEnabled,
    isConnected,
    isFullScreen,
    isMicEnabled,
    isRecording,
    isRecordingAvailable,
    isSharingEnabled,
    leaveRoom,
    record,
    screenSharing,
    setCam,
    setMic,
    setShare
  } from '../utils'
  import CamSettingPopup from './CamSettingPopup.svelte'
  import MicSettingPopup from './MicSettingPopup.svelte'
  import RoomAccessPopup from './RoomAccessPopup.svelte'
  import { afterUpdate } from 'svelte'

  export let room: Room
  export let fullScreen: boolean = false

  let allowCam: boolean = false
  const allowShare: boolean = true
  let allowLeave: boolean = false
  let popup: CompAndProps | undefined = undefined
  let grow: HTMLElement
  let leftPanel: HTMLElement
  let leftPanelSize: number = 0
  let noLabel: boolean = false
  let combinePanel: boolean = false

  $: allowCam = $currentRoom?.type === RoomType.Video
  $: allowLeave = $myInfo?.room !== ($myOffice?._id ?? plugin.ids.Reception)

  async function changeMute (): Promise<void> {
    await setMic(!$isMicEnabled)
  }

  async function changeCam (): Promise<void> {
    await setCam(!$isCameraEnabled)
  }

  async function changeShare (): Promise<void> {
    await setShare(!$isSharingEnabled)
  }

  async function leave (): Promise<void> {
    await leaveRoom($myInfo, $myOffice)
  }

  function getPopup (component: AnySvelteComponent, e: MouseEvent, props: any = {}): CompAndProps {
    return {
      id: 'fsPopup',
      is: component,
      props,
      element: eventToHTMLElement(e),
      options: { category: 'popup', overlay: true },
      close: () => {
        popup = undefined
      }
    }
  }

  function micSettings (e: MouseEvent): void {
    if (fullScreen) {
      popup = getPopup(MicSettingPopup, e)
    } else {
      showPopup(MicSettingPopup, {}, eventToHTMLElement(e))
    }
  }

  function camSettings (e: MouseEvent): void {
    if (fullScreen) {
      popup = getPopup(CamSettingPopup, e)
    } else {
      showPopup(CamSettingPopup, {}, eventToHTMLElement(e))
    }
  }

  function setAccess (e: MouseEvent): void {
    if (isOffice(room) && room.person !== me) return
    if (fullScreen) {
      popup = getPopup(RoomAccessPopup, e, { room })
    } else {
      showPopup(RoomAccessPopup, { room }, eventToHTMLElement(e))
    }
  }

  async function getLink (): Promise<string> {
    const roomInfo = await client.findOne(love.class.RoomInfo, { room: room._id })
    if (roomInfo !== undefined) {
      const navigateUrl = getCurrentLocation()
      navigateUrl.query = {
        sessionId: roomInfo._id
      }

      const func = await getResource(login.function.GetInviteLink)
      return await func(24, '', -1, AccountRole.Guest, encodeURIComponent(JSON.stringify(navigateUrl)))
    }
    return ''
  }

  async function copyGuestLink (): Promise<void> {
    await copyTextToClipboard(getLink())
    linkCopied = true
    clearTimeout(linkTimeout)
    linkTimeout = setTimeout(() => {
      linkCopied = false
    }, 3000)
  }

  let linkCopied: boolean = false
  let linkTimeout: any | undefined = undefined

  const me = (getCurrentAccount() as PersonAccount).person

  const client = getClient()

  const camKeys = client.getModel().findAllSync(view.class.Action, { _id: plugin.action.ToggleVideo })?.[0]?.keyBinding
  const micKeys = client.getModel().findAllSync(view.class.Action, { _id: plugin.action.ToggleMic })?.[0]?.keyBinding

  const checkBar = (): void => {
    if (grow === undefined || leftPanel === undefined) return
    if (!noLabel && leftPanel.clientWidth > leftPanelSize) leftPanelSize = leftPanel.clientWidth
    if (grow.clientWidth - 16 < leftPanel.clientWidth && !noLabel && !combinePanel) noLabel = true
    else if (grow.clientWidth - 16 < leftPanel.clientWidth && noLabel && !combinePanel) combinePanel = true
    else if (grow.clientWidth * 2 - 32 > leftPanel.clientWidth && noLabel && combinePanel) combinePanel = false
    else if (grow.clientWidth - 32 >= leftPanelSize && noLabel && !combinePanel) noLabel = false
  }
  afterUpdate(() => {
    checkBar()
  })
</script>

<div class="bar w-full flex-center flex-gap-2 flex-no-shrink" class:combinePanel use:resizeObserver={checkBar}>
  <div bind:this={grow} class="flex-grow" />
  {#if room._id !== plugin.ids.Reception}
    <ModernButton
      icon={roomAccessIcon[room.access]}
      tooltip={{ label: plugin.string.ChangeAccess }}
      kind={'secondary'}
      size={'large'}
      disabled={isOffice(room) && room.person !== me}
      on:click={setAccess}
    />
  {/if}
  {#if $isConnected}
    <SplitButton
      size={'large'}
      icon={$isMicEnabled ? plugin.icon.MicEnabled : plugin.icon.MicDisabled}
      showTooltip={{ label: $isMicEnabled ? plugin.string.Mute : plugin.string.UnMute, keys: micKeys }}
      action={changeMute}
      secondIcon={IconUpOutline}
      secondAction={micSettings}
      separate
    />
    {#if allowCam}
      <SplitButton
        size={'large'}
        icon={$isCameraEnabled ? plugin.icon.CamEnabled : plugin.icon.CamDisabled}
        showTooltip={{ label: $isCameraEnabled ? plugin.string.StopVideo : plugin.string.StartVideo, keys: camKeys }}
        disabled={!$isConnected}
        action={changeCam}
        secondIcon={IconUpOutline}
        secondAction={camSettings}
        separate
      />
    {/if}
    {#if allowShare}
      <ModernButton
        icon={$isSharingEnabled ? plugin.icon.SharingEnabled : plugin.icon.SharingDisabled}
        tooltip={{ label: $isSharingEnabled ? plugin.string.StopShare : plugin.string.Share }}
        disabled={($screenSharing && !$isSharingEnabled) || !$isConnected}
        kind={'secondary'}
        size={'large'}
        on:click={changeShare}
      />
    {/if}
    {#if hasAccountRole(getCurrentAccount(), AccountRole.User) && $isRecordingAvailable}
      <ModernButton
        icon={$isRecording ? plugin.icon.StopRecord : plugin.icon.Record}
        tooltip={{ label: $isRecording ? plugin.string.StopRecord : plugin.string.Record }}
        disabled={!$isConnected}
        kind={'secondary'}
        size={'large'}
        on:click={() => record(room)}
      />
    {/if}
  {/if}
  <div bind:this={leftPanel} class="bar__left-panel flex-gap-2 flex-center">
    {#if $isConnected}
      <ModernButton
        icon={$isFullScreen ? love.icon.ExitFullScreen : love.icon.FullScreen}
        tooltip={{
          label: $isFullScreen ? plugin.string.ExitingFullscreenMode : plugin.string.FullscreenMode,
          direction: 'top'
        }}
        kind={'secondary'}
        size={'large'}
        on:click={() => {
          $isFullScreen = !$isFullScreen
        }}
      />
    {/if}
    {#if hasAccountRole(getCurrentAccount(), AccountRole.User) && $isConnected}
      <ModernButton
        icon={view.icon.Copy}
        tooltip={{ label: !linkCopied ? plugin.string.CopyGuestLink : view.string.Copied, direction: 'top' }}
        kind={'secondary'}
        size={'large'}
        on:click={copyGuestLink}
      />
    {/if}
    {#if allowLeave}
      <ModernButton
        icon={plugin.icon.LeaveRoom}
        label={noLabel ? undefined : plugin.string.LeaveRoom}
        tooltip={{ label: plugin.string.LeaveRoom, direction: 'top' }}
        kind={'negative'}
        size={'large'}
        on:click={leave}
      />
    {/if}
  </div>
  <div class="flex-grow" />
  {#if popup && fullScreen}
    <PopupInstance
      is={popup.is}
      props={popup.props}
      element={popup.element}
      onClose={popup.onClose}
      onUpdate={popup.onUpdate}
      zIndex={1}
      top={true}
      close={popup.close}
      overlay={popup.options.overlay}
      contentPanel={undefined}
      {popup}
    />
  {/if}
</div>

<style lang="scss">
  .bar {
    overflow-x: auto;
    position: relative;
    padding: 1rem;
    border-top: 1px solid var(--theme-divider-color);

    &__left-panel {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 1rem;
      height: 100%;
    }

    &.combinePanel .bar__left-panel {
      position: static;
    }
  }
</style>
