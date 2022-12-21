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
    Workspace
  } from '@hcengineering/login-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Loading, locationToUrl, Menu, navigate } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import workbench from '../plugin'

  let workspaces: Workspace[] = []

  onMount(() => {
    getWorkspaces().then((ws: Workspace[]) => {
      workspaces = ws
    })
  })

  $: actions = [
    ...workspaces.map((w) => ({
      label: getEmbeddedLabel(w.workspace),
      action: async () => {
        const loginInfo = (await selectWorkspace(w.workspace))[1]
        navigateToWorkspace(w.workspace, loginInfo)
      },
      isSubmenuRightClicking: true,
      component: Menu,
      props: {
        actions: [
          {
            label: workbench.string.OpenInNewTab,
            action: async () => {
              const loginInfo = (await selectWorkspace(w.workspace))[1]

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

{#if workspaces.length}
  <Menu {actions} on:close />
{:else}
  <Loading />
{/if}
