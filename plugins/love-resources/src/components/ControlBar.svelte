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
  import { Room, RoomType, isOffice, roomAccessIcon } from '@hcengineering/love'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import {
    IconUpOutline,
    ModernButton,
    PopupInstance,
    SplitButton,
    eventToHTMLElement,
    showPopup,
    type AnySvelteComponent,
    type CompAndProps,
    IconMoreV,
    ButtonMenu,
    DropdownIntlItem,
    IconMaximize
  } from '@hcengineering/ui'
  import view, { Action } from '@hcengineering/view'
  import { getActions } from '@hcengineering/view-resources'

  import love from '../plugin'
  import { currentRoom, myInfo, myOffice } from '../stores'
  import {
    isTranscriptionAllowed,
    isCameraEnabled,
    isConnected,
    isFullScreen,
    isMicEnabled,
    isRecording,
    isTranscription,
    isRecordingAvailable,
    isSharingEnabled,
    leaveRoom,
    record,
    screenSharing,
    setCam,
    setMic,
    setShare,
    stopTranscription,
    startTranscription
  } from '../utils'
  import CamSettingPopup from './CamSettingPopup.svelte'
  import MicSettingPopup from './MicSettingPopup.svelte'
  import RoomAccessPopup from './RoomAccessPopup.svelte'
  import RoomLanguageSelector from './RoomLanguageSelector.svelte'
  import ControlBarContainer from './ControlBarContainer.svelte'
  import RoomModal from './RoomModal.svelte'

  export let room: Room
  export let canMaximize: boolean = true
  export let fullScreen: boolean = false
  export let onFullScreen: (() => void) | undefined = undefined

  let allowCam: boolean = false
  const allowShare: boolean = true
  let allowLeave: boolean = false
  let popup: CompAndProps | undefined = undefined
  let noLabel: boolean = false

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

  const me = (getCurrentAccount() as PersonAccount).person

  const camKeys = getClient()
    .getModel()
    .findAllSync(view.class.Action, { _id: love.action.ToggleVideo })?.[0]?.keyBinding
  const micKeys = getClient().getModel().findAllSync(view.class.Action, { _id: love.action.ToggleMic })?.[0]?.keyBinding

  let actions: Action[] = []
  let moreItems: DropdownIntlItem[] = []

  $: void getActions(getClient(), room, love.class.Room).then((res) => {
    actions = res
  })

  $: moreItems = actions.map((action) => ({
    id: action._id,
    label: action.label,
    icon: action.icon
  }))

  async function handleMenuOption (e: CustomEvent<DropdownIntlItem['id']>): Promise<void> {
    const action = actions.find((action) => action._id === e.detail)
    if (action !== undefined) {
      await handleAction(action)
    }
  }

  async function handleAction (action: Action): Promise<void> {
    const fn = await getResource(action.action)
    await fn(room)
  }
  $: withVideo = $screenSharing || room.type === RoomType.Video

  function maximize (): void {
    showPopup(RoomModal, { room }, 'full-centered')
  }
</script>

<ControlBarContainer bind:noLabel>
  <svelte:fragment slot="right">
    {#if $isConnected && isTranscriptionAllowed() && $isTranscription}
      <RoomLanguageSelector {room} kind="icon" />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="center">
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
      {#if hasAccountRole(getCurrentAccount(), AccountRole.User) && isTranscriptionAllowed() && $isConnected}
        <ModernButton
          icon={view.icon.Feather}
          iconProps={$isTranscription ? { fill: 'var(--button-negative-BackgroundColor)' } : {}}
          tooltip={{ label: $isTranscription ? love.string.StopTranscription : love.string.StartTranscription }}
          kind="secondary"
          size="large"
          on:click={() => {
            if ($isTranscription) {
              void stopTranscription(room)
            } else {
              void startTranscription(room)
            }
          }}
        />
      {/if}
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="left">
    {#if $isConnected && withVideo && onFullScreen}
      <ModernButton
        icon={$isFullScreen ? love.icon.ExitFullScreen : love.icon.FullScreen}
        tooltip={{
          label: $isFullScreen ? love.string.ExitingFullscreenMode : love.string.FullscreenMode,
          direction: 'top'
        }}
        kind={'secondary'}
        size={'large'}
        on:click={() => {
          $isFullScreen = !$isFullScreen
        }}
      />
    {/if}

    {#if ($screenSharing || room.type === RoomType.Video) && $isConnected && canMaximize}
      <ModernButton
        icon={IconMaximize}
        tooltip={{
          label: love.string.FullscreenMode,
          direction: 'top'
        }}
        kind={'secondary'}
        iconSize="medium"
        size={'large'}
        on:click={maximize}
      />
    {/if}
    {#if $isConnected && moreItems.length > 0}
      <ButtonMenu
        items={moreItems}
        icon={IconMoreV}
        tooltip={{ label: love.string.MoreOptions, direction: 'top' }}
        kind="secondary"
        size="large"
        noSelection
        on:selected={handleMenuOption}
      />
    {/if}
    {#if allowLeave}
      <ModernButton
        icon={love.icon.LeaveRoom}
        label={noLabel ? undefined : love.string.LeaveRoom}
        tooltip={{ label: love.string.LeaveRoom, direction: 'top' }}
        kind={'negative'}
        size={'large'}
        on:click={leave}
      />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="extra">
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
  </svelte:fragment>
</ControlBarContainer>
