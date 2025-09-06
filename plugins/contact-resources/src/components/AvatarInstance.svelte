<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { themeStore } from '@hcengineering/theme'
  import { AnySvelteComponent, ColorDefinition, Icon, IconSize, resizeObserver } from '@hcengineering/ui'
  import AvatarIcon from './icons/Avatar.svelte'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let url: string | undefined
  export let srcset: string | undefined
  export let displayName: string
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let variant: 'circle' | 'roundedRect' | 'none' = 'roundedRect'
  export let color: ColorDefinition | undefined = undefined
  export let bColor: string | undefined = undefined
  export let withStatus: boolean = false
  export let element: HTMLElement
  export let adaptiveName: boolean = false
  export let disabled: boolean = false
  export let style: 'modern' | undefined = undefined
  export let clipPath: string | undefined = undefined

  function handleClick (): void {
    dispatch('click')
  }

  export function pulse (): void {
    if (element === undefined) return
    const color: string = $themeStore.dark ? '255, 255, 255' : '50, 50, 50'
    element.animate(
      [
        { boxShadow: `0 0 0 .125rem rgba(${color}, .35), 0 0 0 .25rem rgba(${color}, .15)` },
        { boxShadow: `0 0 0 .125rem rgba(${color}, 0), 0 0 0 .25rem rgba(${color}, 0)` }
      ],
      { duration: 250, easing: 'ease-out' }
    )
  }

  let fontSize: number = 16
  let imgError = false

  function handleImgError (): void {
    imgError = true
  }

  $: hasImg = url != null && !imgError
  $: background =
    !hasImg && disabled
      ? 'var(--theme-popup-deactivated)'
      : color && !hasImg
        ? color.icon
        : 'var(--theme-button-default)'
</script>

{#if (size === 'full' || adaptiveName) && !url && displayName && displayName !== ''}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    bind:this={element}
    class="hulyAvatar-container hulyAvatarSize-{size} {variant} {style}"
    class:no-img={!hasImg && color}
    class:bordered={!hasImg && color === undefined}
    class:border={bColor !== undefined}
    class:withStatus
    style:--border-color={bColor ?? 'var(--primary-button-default)'}
    style:background-color={background}
    style:clip-path={clipPath}
    use:resizeObserver={(element) => {
      fontSize = element.clientWidth * 0.6
    }}
    on:click={handleClick}
  >
    <div
      class="ava-text"
      style:color={color ? color.iconText : 'var(--primary-button-color)'}
      style:font-size={`${fontSize}px`}
      data-name={displayName.toLocaleUpperCase()}
    />
  </div>
{:else}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    bind:this={element}
    class="hulyAvatar-container hulyAvatarSize-{size} {variant} {style}"
    class:no-img={!hasImg && color}
    class:bordered={!hasImg && color === undefined}
    class:border={bColor !== undefined}
    class:withStatus
    style:--border-color={bColor ?? 'var(--primary-button-default)'}
    style:background-color={background}
    style:clip-path={clipPath}
    on:click={handleClick}
  >
    {#if url && !imgError}
      <img
        class="hulyAvatarSize-{size} ava-image {disabled ? 'disabled' : ''} {style}"
        src={url}
        {srcset}
        alt={''}
        on:error={handleImgError}
      />
    {:else if displayName && displayName !== ''}
      <div
        class="ava-text"
        style:color={disabled ? 'white' : color ? color.iconText : 'var(--primary-button-color)'}
        data-name={displayName.toLocaleUpperCase()}
      />
    {:else}
      <div class="icon">
        <Icon
          icon={icon ?? AvatarIcon}
          fill={color ? 'var(--primary-button-color)' : 'var(--theme-caption-color)'}
          size={'full'}
        />
      </div>
    {/if}
  </div>
{/if}
