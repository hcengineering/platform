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
  import { Asset } from '@hcengineering/platform'
  import { AnySvelteComponent, ColorDefinition, Icon, IconSize, resizeObserver } from '@hcengineering/ui'
  import AvatarIcon from './icons/Avatar.svelte'

  export let url: string[] | undefined
  export let srcset: string | undefined
  export let displayName: string
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let variant: 'circle' | 'roundedRect' | 'none' = 'roundedRect'
  export let color: ColorDefinition | undefined = undefined
  export let bColor: string | undefined = undefined
  export let standby: boolean = false
  export let withStatus: string | undefined = undefined
  export let element: HTMLElement

  export function pulse (): void {
    if (element) element.animate(pulsating, { duration: 150, easing: 'ease-out' })
    if (standby) {
      standbyMode = false
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        standbyMode = true
      }, 2000)
    }
  }

  let standbyMode: boolean = standby
  let timer: any | undefined = undefined
  let fontSize: number = 16
  const pulsating: Keyframe[] = [
    { boxShadow: '0 0 .125rem 0 var(--theme-bg-color), 0 0 0 .125rem var(--border-color)' },
    { boxShadow: '0 0 .375rem .375rem var(--theme-bg-color), 0 0 0 .25rem var(--border-color)' }
  ]
</script>

{#if size === 'full' && !url && displayName && displayName !== ''}
  <div
    bind:this={element}
    class="ava-{size} flex-center avatar-container {variant}"
    class:no-img={!url && color}
    class:bordered={!url && color === undefined}
    class:border={bColor !== undefined}
    class:standby
    class:standbyOn={standby && !standbyMode}
    class:withStatus
    style:--border-color={bColor ?? 'var(--primary-button-default)'}
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
    bind:this={element}
    class="ava-{size} flex-center avatar-container stat {variant}{withStatus ? ` ${withStatus}-hole` : ''}"
    class:no-img={!url && color}
    class:bordered={!url && color === undefined}
    class:border={bColor !== undefined}
    class:standby
    class:standbyOn={standby && !standbyMode}
    class:withStatus
    style:--border-color={bColor ?? 'var(--primary-button-default)'}
    style:background-color={color && !url ? color.icon : 'var(--theme-button-default)'}
  >
    {#if url}
      <img class="ava-{size} ava-image" src={url[0]} {srcset} alt={''} />
    {:else if displayName && displayName !== ''}
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
    position: relative;
    flex-shrink: 0;
    background-color: var(--theme-button-default);
    pointer-events: none;

    &.withStatus:not(.circle) {
      mask-repeat: no-repeat;
      mask-size: cover;
    }

    &.circle,
    &.circle img.ava-image {
      border-radius: 50%;
    }
    &.roundedRect,
    &.roundedRect img.ava-image {
      border-radius: 20%;
    }
    &.standby {
      opacity: 0.5;
      transition: opacity 0.5s ease-in-out;
      pointer-events: all;

      &:hover,
      &.standbyOn {
        opacity: 1;
      }
      &:hover {
        transition-duration: 0.1s;
      }
    }

    &.no-img {
      color: var(--primary-button-color);
      border-color: transparent;
    }
    &.bordered {
      color: var(--theme-dark-color);
      border: 1px solid var(--theme-button-border);
    }
    &.border {
      border: 1px solid var(--theme-bg-color);
      outline: 2px solid var(--border-color);

      &.ava-xx-small,
      &.ava-inline,
      &.ava-tiny,
      &.ava-card,
      &.ava-x-small {
        outline-width: 1px;
      }
      &.ava-large,
      &.ava-x-large,
      &.ava-2x-large {
        border-width: 2px;
      }
    }
    img {
      object-fit: cover;
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

  .ava-xx-small {
    width: 0.75rem; // 8
    height: 0.75rem;

    .ava-text {
      font-size: 0.375rem;
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

  .status {
    position: absolute;
    bottom: 0;
    right: 0;

    &.xx-small,
    &.inline,
    &.tiny,
    &.smaller,
    &.x-small {
      bottom: -0.313rem;
      right: -0.313rem;
    }

    &.card,
    &.small {
      bottom: -0.375rem;
      right: -0.375rem;
    }
  }
</style>
