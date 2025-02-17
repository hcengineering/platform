<script lang="ts">
  import login, { LoginInfo, WorkspaceLoginInfo } from '@hcengineering/login'
  import { getLoginInfoFromQuery, navigateToWorkspace } from '@hcengineering/login-resources'
  import { setMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Loading, setMetadataLocalStorage } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import { afterConfirm, goToLogin } from '../utils'

  onMount(async () => {
    const result = await getLoginInfoFromQuery()
    if (result !== undefined) {
      if (isWorkspaceLoginInfo(result)) {
        navigateToWorkspace(result.workspace, result, undefined, true)
        return
      }
      setMetadata(presentation.metadata.Token, result.token)
      setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
      setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
      await afterConfirm(true)
    } else {
      goToLogin('login', true)
    }
  })

  function isWorkspaceLoginInfo (info: WorkspaceLoginInfo | LoginInfo): info is WorkspaceLoginInfo {
    return (info as WorkspaceLoginInfo).workspace !== undefined
  }
</script>

<Loading />
