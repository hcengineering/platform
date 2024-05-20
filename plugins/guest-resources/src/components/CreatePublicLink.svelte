<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Doc, Timestamp } from '@hcengineering/core'
  import { PublicLink, createPublicLink } from '@hcengineering/guest'
  import presentaion, {
    Card,
    MessageBox,
    copyTextToClipboard,
    createQuery,
    getClient
  } from '@hcengineering/presentation'
  import { Button, Loading, showPopup, ticker } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import guest from '../plugin'

  export let value: Doc

  const client = getClient()
  const query = createQuery()
  let loading = true
  let link: PublicLink | undefined

  const dispatch = createEventDispatcher()

  async function generate (object: Doc): Promise<void> {
    const panelComponent = client.getHierarchy().classHierarchyMixin(object._class, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? view.component.EditDoc
    const loc = await getObjectLinkFragment(client.getHierarchy(), object, {}, comp)
    await createPublicLink(client, value, loc)
  }

  async function checkNeedGenerate (value: Doc, loading: boolean, link: PublicLink | undefined): Promise<void> {
    if (!loading || link !== undefined) return
    await generate(value)
  }

  query.query(
    guest.class.PublicLink,
    { attachedTo: value._id },
    (res) => {
      link = res[0]
      void checkNeedGenerate(value, loading, link)
      loading = false
    },
    { limit: 1 }
  )

  function close () {
    dispatch('close')
  }

  function copy (): void {
    if (link?.url === undefined || link.url === '') return
    copyTextToClipboard(link.url)
    copied = true
    copiedTime = Date.now()
  }

  async function revoke (): Promise<void> {
    if (!revokable || link === undefined) return
    showPopup(
      MessageBox,
      {
        label: guest.string.Revoke,
        message: guest.string.RevokeConfirmation
      },
      'top',
      (res) => {
        if (res === true && link !== undefined) {
          client.remove(link)
        }
        dispatch('close')
      }
    )
  }

  $: revokable = link?.revokable ?? false

  let copiedTime: Timestamp | undefined
  let copied = false
  $: checkLabel($ticker)

  function checkLabel (now: number) {
    if (copiedTime) {
      if (copied && now - copiedTime > 1000) {
        copied = false
        copiedTime = undefined
      }
    }
  }
</script>

<Card label={guest.string.PublicLink} canSave={true} okLabel={presentaion.string.Close} on:close okAction={close}>
  {#if link?.url === undefined || link.url === ''}
    <Loading />
  {:else}
    <div class="over-underline link w-full overflow-label" on:click={copy}>{link.url}</div>
  {/if}
  <svelte:fragment slot="buttons">
    {#if revokable}
      <Button label={guest.string.Revoke} kind={'dangerous'} size={'large'} on:click={revoke} />
    {/if}
    {#if link?.url !== undefined && link.url !== ''}
      <Button label={copied ? view.string.Copied : guest.string.Copy} size={'medium'} on:click={copy} />
    {/if}
  </svelte:fragment>
</Card>
