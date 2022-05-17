<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Button, getCurrentLocation, Label, locationToUrl } from '@anticrm/ui'
  import { getWorkspaceHash } from '../utils'
  import { createEventDispatcher } from 'svelte'
  import login from '../plugin'

  const dispatch = createEventDispatcher()

  async function getLink (): Promise<string> {
    const hash = await getWorkspaceHash()
    const loc = getCurrentLocation()
    loc.path[0] = login.component.LoginApp
    loc.path[1] = 'join'
    loc.path.length = 2
    loc.query = {
      workspace: hash
    }
    loc.fragment = undefined

    const link = locationToUrl(loc)
    return document.location.origin + link
  }

  function copy (link: string): void {
    navigator.clipboard.writeText(link)
  }
</script>

<div class="popup">
  <div class="fs-title flex-center">
    <Label label={login.string.InviteDescription} />
  </div>
  {#await getLink() then link}
    <div class="link">{link}</div>
    <div class="buttons flex">
      <Button
        label={login.string.Copy}
        size={'small'}
        on:click={() => {
          copy(link)
        }}
      />
      <Button
        label={login.string.Close}
        size={'small'}
        kind={'primary'}
        on:click={() => {
          dispatch('close')
        }}
      />
    </div>
  {/await}
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.75rem;
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, 0.35));

    .link {
      margin-top: 2rem;
      margin-bottom: 2rem;
    }

    .buttons {
      justify-content: space-around;
      align-items: center;
    }
  }
</style>
