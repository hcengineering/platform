<script lang="ts">
  import love from '../../../plugin'
  import { ModernButton } from '@hcengineering/ui'
  import { leaveRoom } from '../../../utils'
  import { myInfo, myOffice } from '../../../stores'

  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'
  export let noLabel: boolean = false

  async function leave (): Promise<void> {
    await leaveRoom($myInfo, $myOffice)
  }
</script>

<ModernButton
  icon={love.icon.LeaveRoom}
  label={noLabel ? undefined : love.string.LeaveRoom}
  tooltip={{ label: love.string.LeaveRoom, direction: 'top' }}
  kind={'negative'}
  {size}
  on:click={leave}
/>
