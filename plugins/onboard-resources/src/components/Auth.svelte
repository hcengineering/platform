<script lang="ts">
  import { LoginInfo, WorkspaceLoginInfo } from '@hcengineering/login'
  import { getLoginInfoFromQuery, navigateToWorkspace } from '@hcengineering/login-resources'
  import { Loading } from '@hcengineering/ui'
  import { logIn } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import { afterConfirm, goToLogin } from '../utils'

  onMount(async () => {
    const result = await getLoginInfoFromQuery()
    if (result != null) {
      await logIn(result)

      if (isWorkspaceLoginInfo(result)) {
        navigateToWorkspace(result.workspace, result, undefined, true)
        return
      }
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
