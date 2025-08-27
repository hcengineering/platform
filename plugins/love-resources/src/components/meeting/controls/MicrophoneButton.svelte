<script lang="ts">
  import love from '../../../plugin'
  import { state, toggleMicState } from '@hcengineering/media-resources'
  import { eventToHTMLElement, IconUpOutline, showPopup, SplitButton } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getClient } from '@hcengineering/presentation'
  import MicSettingPopup from '../MicSettingPopup.svelte'

  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'

  $: isMicEnabled = $state.microphone?.enabled === true

  const client = getClient()
  const micKeys = client.getModel().findAllSync(view.class.Action, { _id: love.action.ToggleMic })?.[0]?.keyBinding

  function micSettings (e: MouseEvent): void {
    showPopup(MicSettingPopup, {}, eventToHTMLElement(e))
  }
</script>

<SplitButton
  {size}
  icon={isMicEnabled ? love.icon.MicEnabled : love.icon.MicDisabled}
  showTooltip={{
    label: isMicEnabled ? love.string.Mute : love.string.UnMute,
    keys: micKeys
  }}
  action={toggleMicState}
  secondIcon={IconUpOutline}
  secondAction={micSettings}
  separate
/>
