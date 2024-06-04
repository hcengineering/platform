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
  import { getResource } from '@hcengineering/platform'
  import { copyTextToClipboard, getClient } from '@hcengineering/presentation'
  import { IconUpOutline, ModernButton, SplitButton, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { Room, RoomType, isOffice, roomAccessIcon } from '@hcengineering/love'
  import love from '../plugin'
  import { currentRoom, myInfo, myOffice } from '../stores'
  import {
    isCameraEnabled,
    isConnected,
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

  export let room: Room

  let allowCam: boolean = false
  const allowShare: boolean = true
  let allowLeave: boolean = false

  let barWidth: number
  $: noLabel = barWidth < 900

  $: allowCam = $currentRoom?.type === RoomType.Video
  $: allowLeave = $myInfo?.room !== ($myOffice?._id ?? love.ids.Reception)

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

  function micSettings (e: MouseEvent): void {
    showPopup(MicSettingPopup, {}, eventToHTMLElement(e))
  }

  function camSettings (e: MouseEvent): void {
    showPopup(CamSettingPopup, {}, eventToHTMLElement(e))
  }

  function setAccess (e: MouseEvent): void {
    if (isOffice(room) && room.person !== me) return
    showPopup(RoomAccessPopup, { room }, eventToHTMLElement(e))
  }

  async function copyGuestLink (): Promise<void> {
    const getLink = await getResource(login.function.GetInviteLink)
    const link = await getLink(24 * 30, '', -1, AccountRole.Guest)
    await copyTextToClipboard(link)
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

  const camKeys = client.getModel().findAllSync(view.class.Action, { _id: love.action.ToggleVideo })?.[0]?.keyBinding
  const micKeys = client.getModel().findAllSync(view.class.Action, { _id: love.action.ToggleMic })?.[0]?.keyBinding
</script>

<div bind:clientWidth={barWidth} class="bar w-full flex-center flex-gap-2 flex-no-shrink">
  {#if room._id !== love.ids.Reception}
    <ModernButton
      icon={roomAccessIcon[room.access]}
      tooltip={{ label: love.string.ChangeAccess }}
      kind={'secondary'}
      size={'large'}
      disabled={isOffice(room) && room.person !== me}
      on:click={setAccess}
    />
  {/if}
  {#if $isConnected}
    <SplitButton
      size={'large'}
      icon={$isMicEnabled ? love.icon.MicEnabled : love.icon.MicDisabled}
      showTooltip={{ label: $isMicEnabled ? love.string.Mute : love.string.UnMute, keys: micKeys }}
      action={changeMute}
      secondIcon={IconUpOutline}
      secondAction={micSettings}
      separate
    />
    {#if allowCam}
      <SplitButton
        size={'large'}
        icon={$isCameraEnabled ? love.icon.CamEnabled : love.icon.CamDisabled}
        showTooltip={{ label: $isCameraEnabled ? love.string.StopVideo : love.string.StartVideo, keys: camKeys }}
        disabled={!$isConnected}
        action={changeCam}
        secondIcon={IconUpOutline}
        secondAction={camSettings}
        separate
      />
    {/if}
    {#if allowShare}
      <ModernButton
        icon={$isSharingEnabled ? love.icon.SharingEnabled : love.icon.SharingDisabled}
        tooltip={{ label: $isSharingEnabled ? love.string.StopShare : love.string.Share }}
        disabled={($screenSharing && !$isSharingEnabled) || !$isConnected}
        kind={'secondary'}
        size={'large'}
        on:click={changeShare}
      />
    {/if}
    {#if hasAccountRole(getCurrentAccount(), AccountRole.User) && $isRecordingAvailable}
      <ModernButton
        icon={$isRecording ? love.icon.StopRecord : love.icon.Record}
        tooltip={{ label: $isRecording ? love.string.StopRecord : love.string.Record }}
        disabled={!$isConnected}
        kind={'secondary'}
        size={'large'}
        on:click={() => record(room)}
      />
    {/if}
  {/if}
  <div class="bar__left-panel flex-gap-2 flex-center">
    {#if hasAccountRole(getCurrentAccount(), AccountRole.User)}
      <ModernButton
        icon={view.icon.Copy}
        tooltip={{ label: !linkCopied ? love.string.CopyGuestLink : view.string.Copied }}
        kind={'secondary'}
        size={'large'}
        on:click={copyGuestLink}
      />
    {/if}
    {#if allowLeave}
      <ModernButton
        icon={love.icon.LeaveRoom}
        label={noLabel ? undefined : love.string.LeaveRoom}
        tooltip={{ label: love.string.LeaveRoom }}
        kind={'negative'}
        size={'large'}
        on:click={leave}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .bar {
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
  }
</style>
