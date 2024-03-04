<script lang="ts">
  import { LoginInfo, WorkspaceLoginInfo } from '@hcengineering/login'
  import { setMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Loading, setMetadataLocalStorage } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import login from '../plugin'
  import { afterConfirm, getSessionLoginInfo, navigateToWorkspace } from '../utils'

  onMount(async () => {
    const result = await getSessionLoginInfo()
    if (result !== undefined) {
      if (isWorkspaceLoginInfo(result)) {
        navigateToWorkspace(result.workspace, result)
        return
      }
      setMetadata(presentation.metadata.Token, result.token)
      setMetadataLocalStorage(login.metadata.LastToken, result.token)
      setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
      setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
      await afterConfirm()
    }
  })

  function isWorkspaceLoginInfo (info: WorkspaceLoginInfo | LoginInfo): info is WorkspaceLoginInfo {
    return (info as WorkspaceLoginInfo).workspace !== undefined
  }
</script>

<Loading />
