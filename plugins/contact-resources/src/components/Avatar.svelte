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
  import contact, { AvatarProvider, AvatarType, getFirstName, getLastName } from '@hcengineering/contact'
  import { Client, Ref } from '@hcengineering/core'
  import { Asset, getResource } from '@hcengineering/platform'
  import { getBlobURL, getClient } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    Icon,
    IconSize,
    getPlatformAvatarColorForTextDef,
    getPlatformAvatarColorByName,
    themeStore,
    ColorDefinition
  } from '@hcengineering/ui'
  import { getAvatarProviderId } from '../utils'
  import AvatarIcon from './icons/Avatar.svelte'

  export let avatar: string | null | undefined = undefined
  export let name: string | null | undefined = undefined
  export let direct: Blob | undefined = undefined
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  let url: string[] | undefined
  let avatarProvider: AvatarProvider | undefined
  let color: ColorDefinition | undefined = undefined

  $: fname = getFirstName(name ?? '')
  $: lname = getLastName(name ?? '')
  $: displayName =
    name != null ? (lname.length > 1 ? lname.trim()[0] : lname) + (fname.length > 1 ? fname.trim()[0] : fname) : ''

  async function update (size: IconSize, avatar?: string | null, direct?: Blob, name?: string | null) {
    if (direct !== undefined) {
      getBlobURL(direct).then((blobURL) => {
        url = [blobURL]
        avatarProvider = undefined
      })
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
  }
  $: update(size, avatar, direct, name)

  let imageElement: HTMLImageElement | undefined = undefined

  $: srcset = url?.slice(1)?.join(', ')
</script>

<div
  class="ava-{size} flex-center avatar-container"
  class:no-img={!url && color}
  class:bordered={!url && color === undefined}
  style:background-color={color && !url ? color.icon : 'var(--theme-button-default)'}
>
  {#if url}
    {#if size === 'large' || size === 'x-large' || size === '2x-large'}
      <img class="ava-{size} ava-blur" src={url[0]} {srcset} alt={''} bind:this={imageElement} />
    {/if}
    <img class="ava-{size} ava-mask" src={url[0]} {srcset} alt={''} bind:this={imageElement} />
  {:else if name && displayName && displayName !== ''}
    <div class="ava-text" data-name={displayName.toLocaleUpperCase()} />
  {:else}
    <div class="icon">
      <Icon icon={icon ?? AvatarIcon} size={'full'} />
    </div>
  {/if}
</div>

<style lang="scss">
  .avatar-container {
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    background-color: var(--theme-button-default);
    border-radius: 50%;
    pointer-events: none;

    &.no-img {
      color: var(--accented-button-color);
      border-color: transparent;
    }
    &.bordered {
      color: var(--theme-dark-color);
      border: 1px solid var(--theme-button-border);
    }
    img {
      object-fit: cover;
      border: 1px solid var(--avatar-border-color);
    }
    .icon,
    .ava-text::after {
      position: absolute;
      top: 50%;
      left: 50%;
    }
    .icon {
      width: 100%;
      height: 100%;
      color: inherit;
      transform-origin: center;
      transform: translate(-50%, -50%) scale(0.6);
    }
    .ava-text::after {
      content: attr(data-name);
      transform: translate(-50%, -50%);
    }
  }

  .ava-inline {
    width: 0.875rem; // 24
    height: 0.875rem;

    .ava-text {
      font-weight: 500;
      font-size: 0.525rem;
      letter-spacing: -0.05em;
    }
  }

  .ava-tiny {
    width: 1.13rem; // ~18
    height: 1.13rem;

    .ava-text {
      font-weight: 500;
      font-size: 0.625rem;
      letter-spacing: -0.05em;
    }
  }

  .ava-card {
    width: 1.25rem; // 20
    height: 1.25rem;

    .ava-text {
      font-weight: 500;
      font-size: 0.625rem;
      letter-spacing: -0.05em;
    }
  }
  .ava-x-small {
    width: 1.5rem; // 24
    height: 1.5rem;

    .ava-text {
      font-weight: 500;
      font-size: 0.75rem;
      letter-spacing: -0.05em;
    }
  }
  .ava-smaller {
    width: 1.75rem; // 28
    height: 1.75rem;

    .ava-text {
      font-weight: 500;
      font-size: 0.8125rem;
      letter-spacing: -0.05em;
    }
  }
  .ava-small {
    width: 2rem; // 32
    height: 2rem;

    .ava-text {
      font-weight: 500;
      font-size: 0.875rem;
      letter-spacing: -0.05em;
    }
  }
  .ava-medium {
    width: 2.25rem; // 36
    height: 2.25rem;

    .ava-text {
      font-weight: 500;
      font-size: 0.875rem;
      letter-spacing: -0.05em;
    }
  }
  .ava-large {
    width: 4.5rem; // 72
    height: 4.5rem;

    .ava-text {
      font-weight: 500;
      font-size: 2rem;
    }
  }
  .ava-x-large {
    width: 7.5rem; // 120
    height: 7.5rem;

    .ava-text {
      font-weight: 500;
      font-size: 3.5rem;
    }
  }
  .ava-2x-large {
    width: 10rem; // 120
    height: 10rem;

    .ava-text {
      font-weight: 500;
      font-size: 4.75rem;
    }
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
  .ava-large .ava-mask,
  .ava-x-large .ava-mask,
  .ava-2x-large .ava-mask {
    border-width: 2px;
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
