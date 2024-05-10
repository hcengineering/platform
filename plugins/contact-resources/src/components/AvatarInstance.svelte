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
  export let withStatus: boolean = false
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
    class="hulyAvatar-container hulyAvatarSize-{size} {variant}"
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
    class="hulyAvatar-container hulyAvatarSize-{size} stat {variant}"
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
      <img class="hulyAvatarSize-{size} ava-image" src={url[0]} {srcset} alt={''} />
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
