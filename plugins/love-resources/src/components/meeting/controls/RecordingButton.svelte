<script lang="ts">
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { ModernButton } from '@hcengineering/ui'
  import { isRecording, isRecordingAvailable, record } from '../../../utils'
  import love from '../../../plugin'
  import { lkSessionConnected } from '../../../liveKitClient'
  import { Room } from '@hcengineering/love'

  export let room: Room
  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'
</script>

{#if hasAccountRole(getCurrentAccount(), AccountRole.User) && $isRecordingAvailable}
  <ModernButton
    icon={$isRecording ? love.icon.StopRecord : love.icon.Record}
    tooltip={{ label: $isRecording ? love.string.StopRecord : love.string.Record }}
    disabled={!$lkSessionConnected}
    kind={'secondary'}
    {size}
    on:click={() => record(room)}
  />
{/if}
