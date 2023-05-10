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
  import contact, { AvatarProvider, AvatarType } from '@hcengineering/contact'
  import { Client, Ref } from '@hcengineering/core'
  import { Asset, getResource } from '@hcengineering/platform'
  import { getBlobURL, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, Icon, IconSize, hexToRgb, imageToColor } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getAvatarProviderId } from '../utils'
  import AvatarIcon from './icons/Avatar.svelte'

  export let avatar: string | null | undefined = undefined
  export let direct: Blob | undefined = undefined
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  let url: string | undefined
  let avatarProvider: AvatarProvider | undefined

  const dispatch = createEventDispatcher()

  async function update (size: IconSize, avatar?: string | null, direct?: Blob) {
    if (direct !== undefined) {
      getBlobURL(direct).then((blobURL) => {
        url = blobURL
        avatarProvider = undefined
      })
    } else if (avatar) {
      const avatarProviderId = getAvatarProviderId(avatar)
      avatarProvider = avatarProviderId && (await getProvider(getClient(), avatarProviderId))

      if (!avatarProvider || avatarProvider.type === AvatarType.COLOR) {
        url = undefined
      } else if (avatarProvider?.type === AvatarType.IMAGE) {
        url = (await getResource(avatarProvider.getUrl))(avatar, size)
      } else {
        const uri = avatar.split('://')[1]
        url = (await getResource(avatarProvider.getUrl))(uri, size)
      }
    } else {
      url = undefined
      avatarProvider = undefined
    }
  }
  $: update(size, avatar, direct)

  let style = ''

  async function updateStyle (avatar?: string | null, avatarProvider?: AvatarProvider) {
    if (!avatar || avatarProvider?.type !== AvatarType.COLOR) {
      style = ''
    } else {
      const uri = avatar.split('://')[1]

      const color = (await getResource(avatarProvider.getUrl))(uri, size)
      style = `background-color: ${color}`
      accentColor = hexToRgb(color)
      dispatch('accent-color', accentColor)
    }
  }
  $: updateStyle(avatar, avatarProvider)

  let imageElement: HTMLImageElement | undefined = undefined
  let accentColor: any | undefined
</script>

<div class="ava-{size} flex-center avatar-container" class:no-img={!url} {style}>
  {#if url}
    {#if size === 'large' || size === 'x-large'}
      <img
        class="ava-{size} ava-blur"
        src={url}
        alt={''}
        bind:this={imageElement}
        on:load={(data) => {
          if (imageElement !== undefined) {
            try {
              accentColor = imageToColor(imageElement)
              dispatch('accent-color', accentColor)
            } catch (err) {
              // Ignore
            }
          }
        }}
      />
    {/if}
    <img
      class="ava-{size} ava-mask"
      src={url}
      alt={''}
      bind:this={imageElement}
      on:load={(data) => {
        if (imageElement !== undefined) {
          try {
            accentColor = imageToColor(imageElement)
            dispatch('accent-color', accentColor)
          } catch (err) {
            // ignore
          }
        }
      }}
    />
  {:else}
    <Icon icon={icon ?? AvatarIcon} size={size === 'card' ? 'x-small' : size} />
  {/if}
</div>

<style lang="scss">
  .avatar-container {
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    background-color: var(--avatar-bg-color);
    border-radius: 50%;
    pointer-events: none;

    img {
      object-fit: cover;
      border: 1px solid var(--avatar-border-color);
    }
    &.no-img {
      border-color: transparent;
    }
  }

  .ava-inline {
    width: 0.875rem; // 24
    height: 0.875rem;
  }

  .ava-tiny {
    width: 1.13rem; // ~18
    height: 1.13rem;
  }

  .ava-card {
    width: 1.25rem; // 20
    height: 1.25rem;
  }
  .ava-x-small {
    width: 1.5rem; // 24
    height: 1.5rem;
  }
  .ava-smaller {
    width: 1.75rem; // 32
    height: 1.75rem;
  }
  .ava-small {
    width: 2rem; // 32
    height: 2rem;
  }
  .ava-medium {
    width: 2.25rem; // 36
    height: 2.25rem;
  }
  .ava-large {
    width: 4.5rem; // 72
    height: 4.5rem;
  }
  .ava-x-large {
    width: 7.5rem; // 120
    height: 7.5rem;
  }

  .ava-blur {
    position: absolute;
    filter: blur(32px);
  }
  .ava-mask {
    position: absolute;
    border: 1px solid var(--avatar-border-color);
    border-radius: 50%;
  }

  .ava-inline .ava-mask,
  .ava-inline.no-img,
  .ava-card .ava-mask,
  .ava-card.no-img,
  .ava-x-small .ava-mask,
  .ava-x-small.no-img,
  .ava-smaller .ava-mask,
  .ava-smaller.no-img,
  .ava-small .ava-mask,
  .ava-small.no-img,
  .ava-medium .ava-mask,
  .ava-medium.no-img {
    border-style: none;
  }
</style>
