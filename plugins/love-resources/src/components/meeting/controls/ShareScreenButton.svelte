<script lang="ts">
  import { eventToHTMLElement, IconUpOutline, showPopup, SplitButton } from '@hcengineering/ui'
  import { isShareWithSound, isSharingEnabled, liveKitClient, screenSharing } from '../../../utils'
  import ShareSettingPopup from '../../ShareSettingPopup.svelte'
  import love from '../../../plugin'
  import { lkSessionConnected } from '../../../liveKitClient'
  import { createEventDispatcher } from 'svelte'

  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'

  const dispatch = createEventDispatcher()

  async function changeShare (): Promise<void> {
    const newValue = !$isSharingEnabled
    const audio = newValue && $isShareWithSound
    await liveKitClient.setScreenShareEnabled(newValue, audio)
    dispatch('changeShare')
  }

  function shareSettings (e: MouseEvent): void {
    showPopup(ShareSettingPopup, {}, eventToHTMLElement(e))
  }
</script>

<SplitButton
  {size}
  icon={$isSharingEnabled ? love.icon.SharingEnabled : love.icon.SharingDisabled}
  iconProps={{
    fill: $isSharingEnabled ? 'var(--bg-negative-default)' : 'var(--bg-positive-default)'
  }}
  showTooltip={{ label: $isSharingEnabled ? love.string.StopShare : love.string.Share }}
  disabled={($screenSharing && !$isSharingEnabled) || !$lkSessionConnected}
  action={changeShare}
  secondIcon={IconUpOutline}
  secondAction={shareSettings}
  separate
/>
