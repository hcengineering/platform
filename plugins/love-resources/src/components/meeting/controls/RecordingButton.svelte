<script lang="ts">
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { ButtonBaseSize, ModernButton } from '@hcengineering/ui'
  import { isRecording, isRecordingAvailable, loveClient } from '../../../utils'
  import love from '../../../plugin'
  import { lkSessionConnected } from '../../../liveKitClient'
  import { Room } from '@hcengineering/love'

  export let room: Room
  export let size: ButtonBaseSize = 'large'
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
</script>

{#if hasAccountRole(getCurrentAccount(), AccountRole.User) && $isRecordingAvailable}
  <ModernButton
    icon={$isRecording ? love.icon.StopRecord : love.icon.Record}
    tooltip={{ label: $isRecording ? love.string.StopRecord : love.string.Record }}
    disabled={!$lkSessionConnected}
    {kind}
    {size}
    on:click={() => loveClient.record(room)}
  />
{/if}
