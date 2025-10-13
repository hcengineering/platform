<script lang="ts">
  import { Label, Toggle } from '@hcengineering/ui'
  import love from '../plugin'
  import { isShareWithSound, liveKitClient } from '../utils'
  import { ScreenSharingState, screenSharingState } from '../liveKitClient'
</script>

<div class="antiPopup p-4 grid">
  <Label label={love.string.WithAudio} />
  <Toggle
    showTooltip={{ label: love.string.ShareWithAudioTooltip }}
    on={$isShareWithSound}
    on:change={(e) => {
      $isShareWithSound = e.detail
      if ($screenSharingState === ScreenSharingState.Local) {
        void liveKitClient.setScreenShareEnabled(true, e.detail)
      }
    }}
  />
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 1rem;
    column-gap: 1rem;
    align-items: center;
  }
</style>
