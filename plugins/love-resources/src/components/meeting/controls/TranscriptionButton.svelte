<script lang="ts">
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { isTranscription, isTranscriptionAllowed, startTranscription, stopTranscription } from '../../../utils'
  import { lkSessionConnected } from '../../../liveKitClient'
  import love from '../../../plugin'
  import view from '@hcengineering/view'
  import { ModernButton } from '@hcengineering/ui'
  import { Room } from '@hcengineering/love'

  export let room: Room
  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'
</script>

{#if hasAccountRole(getCurrentAccount(), AccountRole.User) && isTranscriptionAllowed() && $lkSessionConnected}
  <ModernButton
    icon={view.icon.Feather}
    iconProps={$isTranscription ? { fill: 'var(--button-negative-BackgroundColor)' } : {}}
    tooltip={{ label: $isTranscription ? love.string.StopTranscription : love.string.StartTranscription }}
    kind="secondary"
    {size}
    on:click={() => {
      if ($isTranscription) {
        void stopTranscription(room)
      } else {
        void startTranscription(room)
      }
    }}
  />
{/if}
