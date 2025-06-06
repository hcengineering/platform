<script lang="ts">
  import { Loading } from '@hcengineering/ui'
  import { logIn } from '@hcengineering/workbench'
  import { onMount } from 'svelte'

  import {
    afterConfirm,
    getLoginInfoFromQuery,
    getAutoJoinInfo,
    goTo,
    isWorkspaceLoginInfo,
    navigateToWorkspace
  } from '../utils'

  onMount(async () => {
    const autoJoinInfo = getAutoJoinInfo()
    if (autoJoinInfo != null) {
      goTo('autoJoin')
      return
    }

    const result = await getLoginInfoFromQuery()

    if (result != null) {
      await logIn(result)

      if (isWorkspaceLoginInfo(result)) {
        navigateToWorkspace(result.workspaceUrl, result, undefined, true)
        return
      }

      await afterConfirm(true)
    } else {
      goTo('login', true)
    }
  })
</script>

<Loading />
