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
    resizeObserver,
    IconMoreV,
    ButtonMenu,
    DropdownIntlItem
  } from '@hcengineering/ui'
  import view, { Action } from '@hcengineering/view'
  import { getActions } from '@hcengineering/view-resources'
  import { afterUpdate } from 'svelte'

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
  const client = getClient()

  const camKeys = client.getModel().findAllSync(view.class.Action, { _id: love.action.ToggleVideo })?.[0]?.keyBinding
  const micKeys = client.getModel().findAllSync(view.class.Action, { _id: love.action.ToggleMic })?.[0]?.keyBinding

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
  let actions: Action[] = []
  let moreItems: DropdownIntlItem[] = []

  $: void getActions(client, room, love.class.Room).then((res) => {
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
</script>

<div class="bar w-full flex-center flex-gap-2 flex-no-shrink" class:combinePanel use:resizeObserver={checkBar}>
  <div class="bar__right-panel flex-gap-2 flex-center">
    {#if $isConnected && isTranscriptionAllowed() && $isTranscription}
      <RoomLanguageSelector {room} kind="icon" />
    {/if}
  </div>
  <div bind:this={grow} class="flex-grow" />
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
  <div bind:this={leftPanel} class="bar__left-panel flex-gap-2 flex-center">
    {#if $isConnected}
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

    &__right-panel {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 1rem;
      height: 100%;
    }

    &.combinePanel .bar__left-panel {
      position: static;
    }

    &.combinePanel .bar__right-panel {
      position: static;
    }
  }
</style>
