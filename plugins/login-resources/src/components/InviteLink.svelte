<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Timestamp } from '@hcengineering/core'
  import { copyTextToClipboard } from '@hcengineering/presentation'
  import { Button, getCurrentLocation, Label, locationToUrl, ticker } from '@hcengineering/ui'
  import { getInviteLink } from '../utils'
  import { createEventDispatcher } from 'svelte'
  import login from '../plugin'
  import InviteWorkspace from './icons/InviteWorkspace.svelte'
  import { loginId } from '@hcengineering/login'

  const dispatch = createEventDispatcher()

  async function getLink (): Promise<string> {
    const inviteId = await getInviteLink()
    const loc = getCurrentLocation()
    loc.path[0] = loginId
    loc.path[1] = 'join'
    loc.path.length = 2
    loc.query = {
      inviteId
    }
    loc.fragment = undefined

    const link = locationToUrl(loc)
    return document.location.origin + link
  }

  let copiedTime: Timestamp | undefined
  let copied = false
  $: {
    if (copiedTime) {
      if (copied && $ticker - copiedTime > 1000) {
        copied = false
      }
    }
  }
  function copy (link: string): void {
    copyTextToClipboard(link)
    copied = true
    copiedTime = Date.now()
  }
</script>

<div class="antiPopup popup">
  <div class="flex-between fs-title">
    <Label label={login.string.InviteDescription} />
    <InviteWorkspace size="large" />
  </div>
  <div class="mt-2">
    <Label label={login.string.InviteNote} />
  </div>
  {#await getLink() then link}
    <div class="over-underline link" on:click={() => copy(link)}>{link}</div>
    <div class="buttons flex">
      <Button
        label={copied ? login.string.Copied : login.string.Copy}
        size={'medium'}
        on:click={() => {
          copy(link)
        }}
      />
      <Button
        label={login.string.Close}
        size={'medium'}
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
    min-width: 30rem;
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, 0.35));

    .link {
      margin-top: 2rem;
      margin-bottom: 2rem;
      overflow-wrap: break-word;
    }

    .buttons {
      justify-content: space-around;
      align-items: center;
    }
  }
</style>
