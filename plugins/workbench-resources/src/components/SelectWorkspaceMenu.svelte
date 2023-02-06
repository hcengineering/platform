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
  import login, { loginId } from '@hcengineering/login'
  import { getWorkspaces, selectWorkspace, Workspace } from '@hcengineering/login-resources'
  import {
    closePopup,
    fetchMetadataLocalStorage,
    getCurrentLocation,
    Loading,
    Location,
    locationToUrl,
    navigate,
    setMetadataLocalStorage
  } from '@hcengineering/ui'
  import { workbenchId } from '@hcengineering/workbench'
  import { onMount } from 'svelte'
  import { workspacesStore } from '../utils'

  onMount(() => {
    getWorkspaces().then((ws: Workspace[]) => {
      $workspacesStore = ws
    })
  })

  $: doLogin($workspacesStore)

  async function doLogin (ws: Workspace[]) {
    const tokens: Record<string, string> = fetchMetadataLocalStorage(login.metadata.LoginTokens) ?? {}
    await Promise.all(
      ws.map(async (p) => {
        const ws = p.workspace
        const token = tokens[ws]
        if (!token) {
          const loginInfo = (await selectWorkspace(ws))[1]
          if (loginInfo !== undefined) {
            tokens[ws] = loginInfo?.token
          }
        }
      })
    )
    setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
  }

  const loginPath: Location = {
    path: [loginId, 'selectWorkspace']
  }

  function getWorkspaceLink (ws: Workspace): string {
    const loc: Location = {
      path: [workbenchId, ws.workspace]
    }
    return locationToUrl(loc)
  }

  async function clickHandler (e: MouseEvent, ws: string) {
    if (!e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      closePopup()
      closePopup()
      if (ws !== getCurrentLocation().path[1]) {
        navigate({ path: [workbenchId, ws] })
      }
    }
  }

  let activeElement: HTMLElement
  const btns: HTMLElement[] = []

  function focusTarget (target: HTMLElement): void {
    activeElement = target
  }

  const keyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Tab') {
      ev.preventDefault()
      ev.stopPropagation()
    }
    const n = btns.indexOf(activeElement) ?? 0
    if (ev.key === 'ArrowDown') {
      if (n < btns.length - 1) {
        activeElement = btns[n + 1]
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
    if (ev.key === 'ArrowUp') {
      if (n > 0) {
        activeElement = btns[n - 1]
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
  }

  function handleOther (e: MouseEvent) {
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    closePopup()
    navigate({ path: [loginId, 'selectWorkspace'] })
  }

  $: last = $workspacesStore.length
</script>

{#if $workspacesStore.length}
  <div class="antiPopup" on:keydown={keyDown}>
    <div class="ap-space" />
    <div class="ap-scroll">
      <div class="ap-box">
        {#each $workspacesStore as ws, i}
          <a class="stealth" href={getWorkspaceLink(ws)} on:click={(e) => clickHandler(e, ws.workspace)}>
            <button
              bind:this={btns[i]}
              class="ap-menuItem flex-row-center withIcon w-full"
              class:hover={btns[i] === activeElement}
              on:mousemove={() => {
                focusTarget(btns[i])
              }}
            >
              <span class="overflow-label pr-1 flex-grow">{ws.workspace}</span>
            </button>
          </a>
        {/each}
        <a class="stealth" href={locationToUrl(loginPath)} on:click={handleOther}>
          <button
            bind:this={btns[last]}
            class="ap-menuItem flex-row-center withIcon w-full"
            class:hover={btns[last] === activeElement}
            on:mousemove={() => {
              focusTarget(btns[last])
            }}
          >
            <span class="overflow-label pr-1 flex-grow">...</span>
          </button>
        </a>
      </div>
    </div>
    <div class="ap-space" />
  </div>
{:else}
  <div class="antiPopup"><Loading /></div>
{/if}
