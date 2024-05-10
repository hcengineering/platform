<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
<script lang="ts" context="module">
  import contact, { AvatarProvider } from '@hcengineering/contact'
  import { Client, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'

  const providers = new Map<string, AvatarProvider | null>()

  async function getProvider (client: Client, providerId: Ref<AvatarProvider>): Promise<AvatarProvider | undefined> {
    const p = providers.get(providerId)
    if (p !== undefined) {
      return p ?? undefined
    }
    const res = await getClient().findOne(contact.class.AvatarProvider, { _id: providerId })
    providers.set(providerId, res ?? null)
    return res
  }
</script>

<script lang="ts">
  import { AvatarType, getAvatarProviderId, getFirstName, getLastName } from '@hcengineering/contact'
  import { Asset, getMetadata, getResource } from '@hcengineering/platform'
  import { getBlobURL, reduceCalls } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    ColorDefinition,
    IconSize,
    getPlatformAvatarColorByName,
    getPlatformAvatarColorForTextDef,
    getPlatformColor,
    themeStore
  } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import { Account } from '@hcengineering/core'
  import AvatarInstance from './AvatarInstance.svelte'
  import { loadUsersStatus, statusByUserStore } from '../utils'

  export let avatar: string | null | undefined = undefined
  export let name: string | null | undefined = undefined
  export let direct: Blob | undefined = undefined
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let variant: 'circle' | 'roundedRect' | 'none' = 'roundedRect'
  export let borderColor: number | undefined = undefined
  export let standby: boolean = false
  export let showStatus: boolean = true
  export let account: Ref<Account> | undefined = undefined

  export function pulse (): void {
    avatarInst.pulse()
  }

  let url: string[] | undefined
  let avatarProvider: AvatarProvider | undefined
  let color: ColorDefinition | undefined = undefined
  let element: HTMLElement
  let avatarInst: AvatarInstance

  $: displayName = getDisplayName(name)
  $: bColor = borderColor !== undefined ? getPlatformColor(borderColor, $themeStore.dark) : undefined

  function getDisplayName (name: string | null | undefined): string {
    if (name == null) {
      return ''
    }

    const lastFirst = getMetadata(contact.metadata.LastNameFirst) === true
    const fname = getFirstName(name ?? '').trim()[0] ?? ''
    const lname = getLastName(name ?? '').trim()[0] ?? ''

    return lastFirst ? lname + fname : fname + lname
  }

  const update = reduceCalls(async function (
    size: IconSize,
    avatar?: string | null,
    direct?: Blob,
    name?: string | null
  ) {
    if (direct !== undefined) {
      const blobURL = await getBlobURL(direct)
      url = [blobURL]
      avatarProvider = undefined
    } else if (avatar) {
      const avatarProviderId = getAvatarProviderId(avatar)
      avatarProvider = avatarProviderId && (await getProvider(getClient(), avatarProviderId))

      if (!avatarProvider || avatarProvider.type === AvatarType.COLOR) {
        url = undefined
        color = getPlatformAvatarColorByName(avatar.split('://')[1], $themeStore.dark)
      } else if (avatarProvider?.type === AvatarType.IMAGE) {
        url = (await getResource(avatarProvider.getUrl))(avatar, size)
      } else {
        const uri = avatar.split('://')[1]
        url = (await getResource(avatarProvider.getUrl))(uri, size)
      }
    } else if (name != null) {
      color = getPlatformAvatarColorForTextDef(name, $themeStore.dark)
      url = undefined
      avatarProvider = undefined
    } else {
      url = undefined
      avatarProvider = undefined
    }
  })
  $: void update(size, avatar, direct, name)

  $: srcset = url?.slice(1)?.join(', ')

  onMount(() => {
    loadUsersStatus()
  })

  $: userStatus = account ? $statusByUserStore.get(account) : undefined
</script>

{#if showStatus && account}
  <div class="relative">
    <AvatarInstance
      bind:this={avatarInst}
      {url}
      {srcset}
      {displayName}
      {size}
      {icon}
      {variant}
      {color}
      {bColor}
      {standby}
      bind:element
      withStatus
    />
    {#if showStatus && account}
      <div
        class="hulyAvatar-statusMarker {size}"
        class:online={userStatus?.online}
        class:offline={!userStatus?.online}
      />
    {/if}
  </div>
{:else}
  <AvatarInstance
    bind:this={avatarInst}
    {url}
    {srcset}
    {displayName}
    {size}
    {icon}
    {variant}
    {color}
    {bColor}
    {standby}
    bind:element
  />
{/if}
