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
  import { AccountRole, getCurrentAccount, Timestamp } from '@hcengineering/core'
  import { loginId } from '@hcengineering/login'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { copyTextToClipboard, createQuery } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import {
    Button,
    EditBox,
    getCurrentLocation,
    Label,
    Loading,
    locationToUrl,
    MiniToggle,
    ticker,
    Grid
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import login from '../plugin'
  import { getInviteLink } from '../utils'
  import InviteWorkspace from './icons/InviteWorkspace.svelte'

  const dispatch = createEventDispatcher()

  const query = createQuery()

  interface InviteParams {
    expirationTime: number
    emailMask: string
    limit: number | undefined
  }

  $: query.query(setting.class.InviteSettings, {}, (set) => {
    if (set !== undefined && set.length > 0) {
      expHours = set[0].expirationTime
      emailMask = set[0].emailMask
      limit = set[0].limit
    } else {
      expHours = 48
      limit = -1
    }
    if (limit === -1) noLimit = true
    defaultValues = {
      expirationTime: expHours,
      emailMask,
      limit
    }
  })

  function setToDefault () {
    expHours = defaultValues.expirationTime
    emailMask = defaultValues.emailMask
    limit = defaultValues.limit
  }

  async function getLink (expHours: number, mask: string, limit: number | undefined): Promise<void> {
    loading = true
    const inviteId = await getInviteLink(expHours, mask, limit)
    const loc = getCurrentLocation()
    loc.path[0] = loginId
    loc.path[1] = 'join'
    loc.path.length = 2
    loc.query = {
      inviteId
    }
    loc.fragment = undefined

    const url = locationToUrl(loc)

    const frontUrl = getMetadata(presentation.metadata.FrontUrl)
    const host = frontUrl ?? document.location.origin
    link = host + url
    loading = false
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
  function copy (): void {
    if (link === undefined) return
    copyTextToClipboard(link)
    copied = true
    copiedTime = Date.now()
  }

  let expHours: number = 1
  let emailMask: string = ''
  let limit: number | undefined = undefined
  let useDefault: boolean | undefined = true
  let noLimit: boolean = false
  const isOwnerOrMaintainer: boolean = getCurrentAccount().role > AccountRole.Maintainer
  let defaultValues: InviteParams = {
    expirationTime: 1,
    emailMask: '',
    limit: undefined
  }

  let link: string | undefined
  let loading = false
</script>

<div class="antiPopup popup">
  <div class="flex-between fs-title mb-9">
    <Label label={login.string.InviteDescription} />
    <InviteWorkspace size={'large'} />
  </div>
  {#if isOwnerOrMaintainer}
    <Grid column={1} rowGap={1.5}>
      <MiniToggle
        bind:on={useDefault}
        label={login.string.UseWorkspaceInviteSettings}
        on:click={() => setToDefault()}
      />
      {#if !useDefault}
        <EditBox
          label={login.string.LinkValidHours}
          bind:value={expHours}
          format={'number'}
          on:keypress={() => (link = undefined)}
          disabled={useDefault || !isOwnerOrMaintainer}
        />
        <EditBox
          label={login.string.EmailMask}
          bind:value={emailMask}
          on:keypress={() => (link = undefined)}
          disabled={useDefault || !isOwnerOrMaintainer}
        />
        <MiniToggle bind:on={noLimit} label={login.string.NoLimit} on:change={() => noLimit && (limit = -1)} />
        {#if !noLimit}
          <EditBox
            label={login.string.InviteLimit}
            bind:value={limit}
            format={'number'}
            on:keypress={() => (link = undefined)}
            disabled={useDefault || !isOwnerOrMaintainer}
          />
        {/if}
      {/if}
    </Grid>
  {/if}
  {#if loading}
    <Loading />
  {:else if link !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="over-underline link" on:click={copy}>{link}</div>
    <div class="buttons">
      <Button
        label={login.string.Close}
        size={'medium'}
        kind={'accented'}
        on:click={() => {
          dispatch('close')
        }}
      />
      <Button label={copied ? login.string.Copied : login.string.Copy} size={'medium'} on:click={copy} />
    </div>
  {:else}
    <div class="buttons">
      <Button
        label={login.string.GetLink}
        size={'medium'}
        kind={'accented'}
        on:click={() => {
          ;((limit !== undefined && limit > 0) || noLimit) && getLink(expHours, emailMask, limit)
        }}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 1.25rem;
    user-select: none;
    box-shadow: var(--popup-shadow);

    .link {
      margin: 1.75rem 0 0;
      overflow-wrap: break-word;
    }

    .buttons {
      margin-top: 1.75rem;
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: flex-start;
      align-items: center;
      column-gap: 0.5rem;
    }
  }
</style>
