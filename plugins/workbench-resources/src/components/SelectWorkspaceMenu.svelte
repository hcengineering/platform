<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import login from '@hcengineering/login'
  import {
    getWorkspaces,
    navigateToWorkspace,
    selectWorkspace,
    setLoginInfo,
    Workspace,
    WorkspaceLoginInfo
  } from '@hcengineering/login-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { fetchMetadataLocalStorage, Loading, locationToUrl, Menu, navigate } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import workbench from '../plugin'
  import { workspacesStore } from '../utils'

  onMount(() => {
    getWorkspaces().then((ws: Workspace[]) => {
      $workspacesStore = ws
    })
  })

  async function getLoginIngo (ws: string): Promise<WorkspaceLoginInfo | undefined> {
    const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
    const endpoint = fetchMetadataLocalStorage(login.metadata.LoginEndpoint)
    const email = fetchMetadataLocalStorage(login.metadata.LoginEmail)
    const token = tokens[ws]
    if (token && email && endpoint) {
      return {
        token,
        endpoint,
        email,
        workspace: ws
      }
    } else {
      const loginInfo = (await selectWorkspace(ws))[1]
      return loginInfo
    }
  }

  $: actions = [
    ...$workspacesStore.map((w) => ({
      label: getEmbeddedLabel(w.workspace),
      action: async () => {
        const loginInfo = await getLoginIngo(w.workspace)
        navigateToWorkspace(w.workspace, loginInfo)
      },
      isSubmenuRightClicking: true,
      component: Menu,
      props: {
        actions: [
          {
            label: workbench.string.OpenInNewTab,
            action: async () => {
              const loginInfo = await getLoginIngo(w.workspace)

              if (!loginInfo) {
                return
              }
              setLoginInfo(loginInfo)
              const url = locationToUrl({ path: [workbenchId, w.workspace] })
              window.open(url, '_blank')?.focus()
            }
          }
        ]
      }
    })),
    {
      label: getEmbeddedLabel('...'),
      action: async () => {
        navigate({ path: [login.component.LoginApp, 'selectWorkspace'] })
      },
      isSubmenuRightClicking: false
    }
  ]
</script>

{#if $workspacesStore.length}
  <Menu {actions} on:update on:close />
{:else}
  <div class="antiPopup"><Loading /></div>
{/if}
