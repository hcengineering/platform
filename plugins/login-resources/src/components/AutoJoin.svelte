<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { Analytics } from '@hcengineering/analytics'
  import { logIn, workbenchId } from '@hcengineering/workbench'
  import { setMetadata, translate } from '@hcengineering/platform'
  import { Location, Loading, Label, getCurrentLocation, navigate } from '@hcengineering/ui'
  import { type LoginInfo } from '@hcengineering/account-client'
  import { loginId } from '@hcengineering/login'
  import { themeStore } from '@hcengineering/theme'
  import presentation from '@hcengineering/presentation'

  import { setLoginInfo, checkAutoJoin, isWorkspaceLoginInfo, navigateToWorkspace } from '../utils'
  import login from '../plugin'
  import LoginForm from './LoginForm.svelte'

  const location = getCurrentLocation()
  Analytics.handleEvent('auto_join_invite_link_activated')

  let loading = true
  let email: string | undefined = undefined
  let name = ''
  let subtitle = ''

  onMount(() => {
    void check()
  })

  $: void updateSubtitle(name, $themeStore.language)

  async function updateSubtitle (name: string, language: string): Promise<void> {
    if (name != null && name !== '') {
      subtitle = await translate(login.string.Hello, { name }, language)
    }
  }

  async function check (): Promise<void> {
    if (location.query?.inviteId == null || location.query?.firstName == null) return

    const [, result] = await checkAutoJoin(
      location.query.inviteId,
      location.query.firstName,
      location.query.lastName ?? ''
    )

    if (result != null) {
      if (isWorkspaceLoginInfo(result)) {
        await logIn(result)
        navigateToWorkspace(result.workspaceUrl, result, location.query?.navigateUrl)
        return
      } else {
        if (result.email == null) {
          console.error('No email in auto join info')
          navigate({ path: [loginId, 'login'] })
          return
        }

        email = result.email
        name = result.name
      }
    }
    if (loading) {
      loading = false
    }
  }

  async function onLogin (loginInfo: LoginInfo | null): Promise<void> {
    if (loginInfo?.token == null) {
      return
    }

    setMetadata(presentation.metadata.Token, loginInfo.token)
    await check()
  }
</script>

{#if loading}
  <div>
    <div class="title"><Label label={login.string.ProcessingInvite} /></div>
    <Loading />
  </div>
{:else}
  <LoginForm signUpDisabled {email} caption={login.string.SignToProceed} {subtitle} {onLogin} />
{/if}

<style lang="scss">
  .title {
    color: var(--theme-caption-color);
    text-align: center;
  }
</style>
