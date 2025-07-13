<script lang="ts">
  import { Loading, getCurrentLocation } from '@hcengineering/ui'
  import { logIn } from '@hcengineering/workbench'
  import { onMount } from 'svelte'

  import {
    afterConfirm,
    getLoginInfoFromQuery,
    getAutoJoinInfo,
    goTo,
    isWorkspaceLoginInfo,
    navigateToWorkspace,
    trackOAuthCompletion
  } from '../utils'

  function getProviderFromUrl (): string | null {
    const location = getCurrentLocation()
    const referrer = document.referrer

    if (referrer.includes('accounts.google.com')) {
      return 'google'
    } else if (referrer.includes('github.com')) {
      return 'github'
    } else if (location.query?.provider != null && location.query.provider !== '') {
      return location.query.provider
    }

    return null
  }

  onMount(async () => {
    const autoJoinInfo = getAutoJoinInfo()
    if (autoJoinInfo != null) {
      goTo('autoJoin')
      return
    }

    const result = await getLoginInfoFromQuery()
    const provider = getProviderFromUrl()

    trackOAuthCompletion(result, provider)

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
