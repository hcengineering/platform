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

<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { Asset } from '@hcengineering/platform'
  import { getBlobURL, reduceCalls, getClient, sizeToWidth } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    ColorDefinition,
    IconSize,
    getPlatformColor,
    themeStore,
    getPlatformAvatarColorByName,
    getPlatformAvatarColorForTextDef
  } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import { type AvatarInfo, getAvatarUrlInfo, getAvatarDisplayName, getAvatarColorForId } from '@hcengineering/contact'
  import { PersonUuid, Ref, type Data, type WithLookup } from '@hcengineering/core'

  import { loadUsersStatus, statusByUserStore } from '../utils'
  import AvatarInstance from './AvatarInstance.svelte'

  export let person: (Data<WithLookup<AvatarInfo>> & { _id?: Ref<Person>, personUuid?: PersonUuid }) | undefined =
    undefined
  export let name: string | null | undefined = undefined
  export let direct: Blob | undefined = undefined
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let variant: 'circle' | 'roundedRect' | 'none' = 'roundedRect'
  export let borderColor: number | undefined = undefined
  export let showStatus: boolean = false
  export let adaptiveName: boolean = false

  export function pulse (): void {
    avatarInst.pulse()
  }

  let url: string | undefined
  let srcSet: string | undefined

  let color: ColorDefinition | undefined = undefined
  let element: HTMLElement
  let avatarInst: AvatarInstance

  $: displayName = getAvatarDisplayName(name)
  $: bColor = borderColor !== undefined ? getPlatformColor(borderColor, $themeStore.dark) : undefined

  const update = reduceCalls(async function (
    size: IconSize,
    avatar?: Data<WithLookup<AvatarInfo>>,
    direct?: Blob,
    name?: string | null
  ) {
    const client = getClient()
    const directUrl = direct !== undefined ? await getBlobURL(direct) : undefined

    if (directUrl !== undefined) {
      url = directUrl
      srcSet = undefined
      color = undefined
    } else {
      ;({ url, srcSet, color } = await getAvatarUrlInfo(client, avatar, sizeToWidth(size), name))

      if (url === undefined && color === undefined && name != null) {
        if (avatar != null) {
          color = getPlatformAvatarColorByName(
            avatar.avatarProps?.color ?? getAvatarColorForId(displayName),
            $themeStore.dark
          )
        } else {
          color = getPlatformAvatarColorForTextDef(name, $themeStore.dark)
        }
      }
    }
  })
  $: void update(size, person, direct, name)

  onMount(() => {
    loadUsersStatus()
  })

  $: isOnline = person?.personUuid !== undefined && $statusByUserStore.get(person.personUuid)?.online === true
</script>

{#if showStatus && person}
  <div class="relative">
    <AvatarInstance
      bind:this={avatarInst}
      {url}
      srcset={srcSet}
      {displayName}
      {size}
      {icon}
      {variant}
      {color}
      {bColor}
      bind:element
      withStatus
      {adaptiveName}
    />
    <div class="hulyAvatar-statusMarker {size}" class:online={isOnline} class:offline={!isOnline} />
  </div>
{:else}
  <AvatarInstance
    bind:this={avatarInst}
    {url}
    srcset={srcSet}
    {displayName}
    {size}
    {icon}
    {variant}
    {color}
    {bColor}
    bind:element
    {adaptiveName}
  />
{/if}
