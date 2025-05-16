<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import OpenId from '../icons/OpenId.svelte'
  import login from '../../plugin'
  import { getMetadata } from '@hcengineering/platform'

  const openIdDisplayName = getMetadata(login.metadata.OpenIdDisplayName) ?? 'OpenId'
</script>

<div class="flex-row-center flex-gap-2">
  <OpenId />
  <Label label={login.string.ContinueWith} params={{ provider: openIdDisplayName }} />
</div>
