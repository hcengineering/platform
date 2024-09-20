<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import OpenId from '../icons/OpenId.svelte'
  import login from '../../plugin'
</script>

<div class="flex-row-center flex-gap-2">
  <OpenId />
  <Label label={login.string.ContinueWith} params={{ provider: 'OpenId' }} />
</div>
