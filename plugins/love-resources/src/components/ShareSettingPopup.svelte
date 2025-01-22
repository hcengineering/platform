<script lang="ts">
  import { Label, Toggle } from '@hcengineering/ui'
  import love from '../plugin'
  import { setShare, isShareWithSound, isSharingEnabled } from '../utils'
</script>

<div class="antiPopup p-4 grid">
  <Label label={love.string.WithAudio} />
  {$isShareWithSound}
  <Toggle
    showTooltip={{ label: love.string.ShareWithAudioTooltip }}
    on={$isShareWithSound}
    on:change={(e) => {
      $isShareWithSound = e.detail
      if ($isSharingEnabled) {
        setShare($isSharingEnabled, e.detail)
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
