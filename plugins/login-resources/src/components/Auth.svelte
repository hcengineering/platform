<script lang="ts">
  import { setMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Loading, setMetadataLocalStorage } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import login from '../plugin'
  import { afterConfirm, getLoginInfoFromQuery, goTo, isWorkspaceLoginInfo, navigateToWorkspace } from '../utils'

  onMount(async () => {
    const result = await getLoginInfoFromQuery()

    if (result != null) {
      if (isWorkspaceLoginInfo(result)) {
        navigateToWorkspace(result.workspaceUrl, result, undefined, true)
        return
      }

      setMetadata(presentation.metadata.Token, result.token)
      setMetadataLocalStorage(login.metadata.LoginAccount, result.account)
      await afterConfirm(true)
    } else {
      goTo('login', true)
    }
  })
</script>

<Loading />
