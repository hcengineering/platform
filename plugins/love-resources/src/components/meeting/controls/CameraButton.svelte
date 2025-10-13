<script lang="ts">
  import { eventToHTMLElement, IconUpOutline, showPopup, SplitButton } from '@hcengineering/ui'
  import CamSettingPopup from '../CamSettingPopup.svelte'
  import { RoomType } from '@hcengineering/love'
  import love from '../../../plugin'
  import { state, toggleCamState } from '@hcengineering/media-resources'
  import view from '@hcengineering/view'
  import { getClient } from '@hcengineering/presentation'
  import { currentMeetingRoom } from '../../../meetings'

  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'

  $: allowCam = $currentMeetingRoom?.type === RoomType.Video
  $: isCamEnabled = $state.camera?.enabled === true

  const client = getClient()
  const camKeys = client.getModel().findAllSync(view.class.Action, { _id: love.action.ToggleVideo })?.[0]?.keyBinding

  function camSettings (e: MouseEvent): void {
    showPopup(CamSettingPopup, {}, eventToHTMLElement(e))
  }
</script>

{#if allowCam}
  <SplitButton
    {size}
    icon={isCamEnabled ? love.icon.CamEnabled : love.icon.CamDisabled}
    showTooltip={{
      label: isCamEnabled ? love.string.StopVideo : love.string.StartVideo,
      keys: camKeys
    }}
    action={toggleCamState}
    secondIcon={IconUpOutline}
    secondAction={camSettings}
    separate
  />
{/if}
