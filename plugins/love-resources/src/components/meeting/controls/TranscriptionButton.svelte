<script lang="ts">
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { isTranscription, isTranscriptionAllowed, startTranscription, stopTranscription } from '../../../utils'
  import { lkSessionConnected } from '../../../liveKitClient'
  import love from '../../../plugin'
  import view from '@hcengineering/view'
  import { ButtonBaseSize, ModernButton } from '@hcengineering/ui'

  export let size: ButtonBaseSize = 'large'
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
</script>

{#if hasAccountRole(getCurrentAccount(), AccountRole.User) && isTranscriptionAllowed() && $lkSessionConnected}
  <ModernButton
    icon={view.icon.Feather}
    iconProps={$isTranscription ? { fill: 'var(--button-negative-BackgroundColor)' } : {}}
    tooltip={{ label: $isTranscription ? love.string.StopTranscription : love.string.StartTranscription }}
    {kind}
    {size}
    on:click={() => {
      if ($isTranscription) {
        void stopTranscription()
      } else {
        void startTranscription()
      }
    }}
  />
{/if}
