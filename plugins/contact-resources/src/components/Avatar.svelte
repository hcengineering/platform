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
  import { Client, Ref } from '@hcengineering/core'

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
  import { Asset, getMetadata, getResource } from '@hcengineering/platform'
  import { getBlobURL, getClient } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    ColorDefinition,
    Icon,
    IconSize,
    getPlatformAvatarColorByName,
    getPlatformAvatarColorForTextDef,
    themeStore,
    resizeObserver
  } from '@hcengineering/ui'
  import { getAvatarProviderId } from '../utils'
  import AvatarIcon from './icons/Avatar.svelte'
  import { onMount } from 'svelte'

  export let avatar: string | null | undefined = undefined
  export let name: string | null | undefined = undefined
  export let direct: Blob | undefined = undefined
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let variant: 'circle' | 'roundedRect' | 'none' = 'roundedRect'

  let url: string[] | undefined
  let avatarProvider: AvatarProvider | undefined
  let color: ColorDefinition | undefined = undefined
  let fontSize: number = 16
  let element: HTMLElement

  $: displayName = getDisplayName(name)

  function getDisplayName (name: string | null | undefined): string {
    if (name == null) {
      return ''
    }

    const lastFirst = getMetadata(contact.metadata.LastNameFirst) === true
    const fname = getFirstName(name ?? '').trim()[0] ?? ''
    const lname = getLastName(name ?? '').trim()[0] ?? ''

    return lastFirst ? lname + fname : fname + lname
  }

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

  onMount(() => {
    if (size === 'full' && !url && name && displayName && displayName !== '' && element) {
      fontSize = element.clientWidth * 0.6
    }
  })
</script>

{#if size === 'full' && !url && name && displayName && displayName !== ''}
  <div
    bind:this={element}
    class="ava-{size} flex-center avatar-container {variant}"
    class:no-img={!url && color}
    class:bordered={!url && color === undefined}
    style:background-color={color && !url ? color.icon : 'var(--theme-button-default)'}
    use:resizeObserver={(element) => {
      fontSize = element.clientWidth * 0.6
    }}
  >
    <div
      class="ava-text"
      style:color={color ? color.iconText : 'var(--primary-button-color)'}
      style:font-size={`${fontSize}px`}
      data-name={displayName.toLocaleUpperCase()}
    />
  </div>
{:else}
  <div
    class="ava-{size} flex-center avatar-container {variant}"
    class:no-img={!url && color}
    class:bordered={!url && color === undefined}
    style:background-color={color && !url ? color.icon : 'var(--theme-button-default)'}
  >
    {#if url}
      {#if size === 'large' || size === 'x-large' || size === '2x-large'}
        <img class="ava-{size} ava-blur {variant}" src={url[0]} {srcset} alt={''} bind:this={imageElement} />
      {/if}
      <img class="ava-{size} ava-mask {variant}" src={url[0]} {srcset} alt={''} bind:this={imageElement} />
    {:else if name && displayName && displayName !== ''}
      <div
        class="ava-text"
        style:color={color ? color.iconText : 'var(--primary-button-color)'}
        data-name={displayName.toLocaleUpperCase()}
      />
    {:else}
      <div class="icon">
        <Icon icon={icon ?? AvatarIcon} size={'full'} />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .avatar-container {
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    background-color: var(--theme-button-default);
    pointer-events: none;

    &.circle {
      border-radius: 50%;
    }

    &.roundedRect {
      border-radius: 20%;
    }

    &.no-img {
      color: var(--primary-button-color);
      border-color: transparent;
    }
    &.bordered {
      color: var(--theme-dark-color);
      border: 1px solid var(--theme-button-border);
    }
    img {
      object-fit: cover;

      &.circle {
        border: 1px solid var(--avatar-border-color);
      }
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
    .ava-text {
      font-weight: 500;
      letter-spacing: -0.05em;

      &::after {
        content: attr(data-name);
        transform: translate(-50%, -50%);
      }
    }
  }

  .ava-inline {
    width: 0.875rem; // 24
    height: 0.875rem;

    .ava-text {
      font-size: 0.525rem;
    }
  }

  .ava-tiny {
    width: 1.13rem; // ~18
    height: 1.13rem;

    .ava-text {
      font-size: 0.625rem;
    }
  }

  .ava-card {
    width: 1.25rem; // 20
    height: 1.25rem;

    .ava-text {
      font-size: 0.75rem;
    }
  }

  .ava-x-small {
    width: 1.5rem; // 24
    height: 1.5rem;

    .ava-text {
      font-size: 0.875rem;
    }
  }
  .ava-smaller {
    width: 1.75rem; // 28
    height: 1.75rem;

    .ava-text {
      font-size: 1rem;
    }
  }
  .ava-small {
    width: 2rem; // 32
    height: 2rem;

    .ava-text {
      font-size: 1.125rem;
    }
  }
  .ava-medium {
    width: 2.5rem; // 40
    height: 2.5rem;

    .ava-text {
      font-size: 1.375rem;
    }
  }
  .ava-large {
    width: 4.5rem; // 72
    height: 4.5rem;

    .ava-text {
      font-size: 2.75rem;
    }
  }

  .ava-x-large {
    width: 7.5rem; // 120
    height: 7.5rem;

    .ava-text {
      font-size: 4.5rem;
    }
  }

  .ava-2x-large {
    width: 10rem; // 120
    height: 10rem;

    .ava-text {
      font-size: 6rem;
    }
  }

  .ava-full {
    width: 100%;
    height: 100%;
    aspect-ratio: 1;

    .ava-text {
      font-size: inherit;
    }
  }

  .ava-blur {
    position: absolute;
    filter: blur(32px);
  }

  .ava-mask {
    position: absolute;

    &.circle {
      border: 1px solid var(--avatar-border-color);
      border-radius: 50%;
    }

    .roundedRect {
      border-radius: 20%;
    }
  }

  .ava-large .ava-mask,
  .ava-x-large .ava-mask,
  .ava-2x-large .ava-mask {
    &.circle {
      border-width: 2px;
    }
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
